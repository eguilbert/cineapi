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

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, hashedPassword: true },
    });

    const valid = user?.hashedPassword
      ? await bcrypt.compare(password, user.hashedPassword)
      : false;
    if (!valid)
      return res.status(401).json({ error: "Email ou mot de passe invalide" });

    // garantit un UserProfile
    const profile = await prisma.userProfile.upsert({
      where: { user_id: user.id },
      update: {},
      create: { user_id: user.id, username: email.split("@")[0], role: "USER" },
      select: { username: true, role: true, cinemaId: true },
    });

    // créer la session + cookie (v2/v3)
    let sessionIdOrObj;
    if (typeof lucia.createSession === "function") {
      // v2/v3 ont la même signature; en v3 ça renvoie un objet session
      sessionIdOrObj = await lucia.createSession(user.id, {});
    }
    const sessionId = sessionIdOrObj.id ?? sessionIdOrObj; // v3: .id, v2: string

    const cookie =
      typeof lucia.createSessionCookie === "function"
        ? lucia.createSessionCookie(sessionId) // v2/v3
        : null;

    if (cookie) res.setHeader("Set-Cookie", cookie.serialize());

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
    // 1) Récupère le nom réel du cookie de session (ex: "auth_session")
    const cookieName = lucia.sessionCookie?.name || "auth_session";

    // 2) Récupère la valeur via cookie-parser
    const sessionId = req.cookies?.[cookieName];
    console.log("cookie name:", lucia.sessionCookie?.name);
    console.log("req.cookies:", req.cookies);
    console.log("raw Cookie header:", req.headers.cookie);
    if (!sessionId) {
      // Pas de session → 401
      return res.status(401).json({ user: null });
    }

    // 3) Valide la session via Lucia
    const { session, user } = await lucia.validateSession(sessionId);

    if (!session) {
      // Session invalide → pose un blank cookie pour nettoyage côté client
      const blank = lucia.createBlankSessionCookie();
      res.setHeader("Set-Cookie", blank.serialize());
      return res.status(401).json({ user: null });
    }

    // 4) Rotation du cookie si la session est "fresh"
    if (session.fresh) {
      const rotated = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", rotated.serialize());
    }

    // 5) Charge l’utilisateur + son profil
    const dbUser = await prisma.user.findUnique({
      where: { id: session.userId }, // l'id vient de la session Lucia
      select: {
        id: true,
        email: true,
        userProfile: { select: { username: true, role: true, cinemaId: true } },
      },
    });

    if (!dbUser?.userProfile) {
      return res.status(409).json({
        error: "PROFILE_MISSING",
        message: "Aucun UserProfile associé à ce compte",
      });
    }

    // 6) OK → renvoie le user complet
    return res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        username: dbUser.userProfile.username,
        role: dbUser.userProfile.role,
        cinemaId: dbUser.userProfile.cinemaId,
      },
    });
  } catch (err) {
    console.error("GET /me error:", err);
    return res.status(401).json({ user: null });
  }
});

export default router;
