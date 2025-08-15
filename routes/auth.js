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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.hashedPassword) {
      return res.status(401).json({ error: "Email ou mot de passe invalide" });
    }

    const ok = await bcrypt.compare(password, user.hashedPassword);
    if (!ok) {
      return res.status(401).json({ error: "Email ou mot de passe invalide" });
    }

    // ✅ crée et PERSISTE la session en DB via l'adapter (ne pas faire prisma.session.create)
    const { id: sessionId } = await lucia.createSession(user.id, {});

    // ✅ génère le Set-Cookie correctement (SameSite/secure/path etc. depuis ta config Lucia)
    const cookie = lucia.createSessionCookie(sessionId);
    // en Express, on envoie la chaîne brute:
    res.setHeader("Set-Cookie", cookie.serialize());

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("❌ Erreur login:", err);
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
    const sessionId =
      req.cookies?.session || parse(req.headers.cookie || "").session;

    if (!sessionId) return res.status(401).json({ user: null });

    const { user, session } = await lucia.validateSession(sessionId);
    if (!session) {
      // session invalide → blank cookie pour nettoyer côté client
      const blank = lucia.createBlankSessionCookie();
      res.setHeader("Set-Cookie", blank.serialize());
      return res.status(401).json({ user: null });
    }
    // session valide : si "fresh", renvoyer un set-cookie (rotation/refresh)
    if (session.fresh) {
      const cookie = lucia.createSessionCookie(session.id);
      res.setHeader("Set-Cookie", cookie.serialize());
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        username: user.username,
      },
    });
  } catch {
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
