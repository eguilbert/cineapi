import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { lucia } from "../lib/lucia.js";
import { prisma } from "../lib/prisma.js";
import { parse } from "cookie"; // ou 'oslo/cookie' si tu préfères

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    console.log("🔵 Reçu:", req.body);
    if ("id" in req.body) {
      console.warn("🚨 id détecté dans req.body !!!", req.body.id);
      //throw new Error("Ne pas envoyer d'id !");
    }
    const existing = await prisma.user.findUnique({
      where: { email: req.body.email },
    });
    console.log("🧬 EXISTING:", existing);
    if (existing) {
      console.log("⚠️ Email déjà utilisé");
      return res.status(400).json({ error: "Email déjà utilisé" });
    }

    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const password = String(req.body.password || "");
    const username =
      typeof req.body.username === "string" ? req.body.username : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("🔐 Password haché");
    console.log("📦 Données envoyées à Prisma:", {
      email,
      hashedPassword,
      cleanUsername,
      role: "INVITE",
    });
    console.log("🔎 Types envoyés à Prisma:");
    console.log("email:", typeof email, email);
    console.log("username:", typeof cleanUsername, cleanUsername);
    console.log("hashedPassword:", typeof hashedPassword, hashedPassword);
    const userId = crypto.randomUUID();
    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        id: userId, // 👈 ID explicite
        username,
        role: "INVITE",
      },
    });

    console.log("✅ Utilisateur créé:", user);
    return res.json({ user }); // ✅ user est bien défini ici
  } catch (err) {
    console.error("❌ Erreur dans /register:", err);

    const errorDetails = {
      name: err.name,
      message: err.message,
      meta: err.meta,
      stack: err.stack,
    };

    res.status(500).json({
      error: "Erreur interne",
      details: errorDetails,
    });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .toLowerCase()
      .trim();
    const password = String(req.body.password || "");

    // 1) Trouver l'utilisateur (sans rien révéler sur l'existence)
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, hashedPassword: true },
    });

    // 2) Vérif mot de passe (éviter la fuite d'info)
    const valid = user?.hashedPassword
      ? await bcrypt.compare(password, user.hashedPassword)
      : false;

    if (!valid) {
      // même message pour email inconnu et mauvais mot de passe
      return res.status(401).json({ error: "Email ou mot de passe invalide" });
    }

    // 3) Garantir un UserProfile (upsert)
    const profile = await prisma.userProfile.upsert({
      where: { user_id: user.id }, // ou userId selon ton mapping Prisma
      update: {},
      create: {
        user_id: user.id,
        username: email.split("@")[0], // fallback simple (tu peux améliorer)
        role: "USER",
      },
      select: { username: true, role: true, cinemaId: true },
    });

    // 4) Créer la session Lucia (persiste via l’adapter)
    const { id: sessionId } = await lucia.createSession(user.id, {});

    // 5) Déposer le cookie (respecte secure/samesite/path depuis ta config Lucia)
    const cookie = lucia.createSessionCookie(sessionId);
    res.setHeader("Set-Cookie", cookie.serialize());

    // 6) Réponse unifiée
    return res.json({
      user: {
        id: user.id,
        email: user.email,
        username: profile.username,
        role: profile.role,
        cinemaId: profile.cinemaId,
      },
    });
  } catch (err) {
    console.error("❌ /login error:", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /auth/logout
router.post("/logout", async (req, res) => {
  try {
    const sessionId =
      req.cookies?.session || parse(req.headers.cookie || "").session;

    if (sessionId) {
      await lucia.invalidateSession(sessionId);
    }
    const blank = lucia.createBlankSessionCookie();
    res.setHeader("Set-Cookie", blank.serialize());

    res.json({ ok: true });
  } catch (e) {
    res.status(200).json({ ok: true }); // idempotent
  }
});

router.get("/me", async (req, res) => {
  try {
    // 1. Récupérer le cookie de session
    const sessionId =
      req.cookies?.session || parse(req.headers.cookie || "").session;

    if (!sessionId) {
      return res.status(401).json({ user: null });
    }

    // 2. Valider la session Lucia
    const { user, session } = await lucia.validateSession(sessionId);

    if (!session) {
      // session invalide → blank cookie pour nettoyer côté client
      const blank = lucia.createBlankSessionCookie();
      res.setHeader("Set-Cookie", blank.serialize());
      return res.status(401).json({ user: null });
    }

    // 3. Rotation du cookie si session "fresh"
    if (session.fresh) {
      const cookie = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", cookie.serialize());
    }

    // 4. Lire le profil en DB (jointure User ↔ UserProfile)
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        profile: {
          select: {
            username: true,
            cinemaId: true,
            role: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.profile) {
      // ⚠️ Pas de profil trouvé → erreur explicite (plus de "Invité_*")
      return res.status(409).json({
        error: "PROFILE_MISSING",
        message: "Aucun UserProfile associé à ce compte",
      });
    }

    // 5. Réponse finale
    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.profile.username,
        role: dbUser.profile.role,
        cinemaId: dbUser.profile.cinemaId,
      },
    });
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(401).json({ user: null });
  }
});

router.get("/debug/users", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  res.json(users);
});
export default router;
