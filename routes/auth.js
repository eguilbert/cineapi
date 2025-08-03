import express from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { lucia } from "../lib/lucia.js";
import { prisma } from "../lib/prisma.js";

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

    const { email, password, username } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const cleanUsername = typeof username === "string" ? username : null;

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
        username: cleanUsername,
        role: "INVITE",
      },
    });

    /*     const session = await lucia.createSession(user.id, {
      id: crypto.randomUUID(), // 👈 génère un vrai UUID
    });

    console.log("🔑 Session créée:", session.id);

    res.cookie("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    }); */
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

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: "Email ou mot de passe invalide" });
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Email ou mot de passe invalide" });
    }

    const session = await lucia.createSession(user.id, {
      id: crypto.randomUUID(),
    });

    res.cookie("session", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 jours
    });

    return res.status(200).json({ user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error("❌ Erreur login:", err.message);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /auth/logout
router.post("/logout", async (req, res) => {
  const sessionId = req.cookies.session;
  if (sessionId) {
    await lucia.invalidateSession(sessionId);
    res.clearCookie("session");
  }
  res.json({ success: true });
});

router.get("/me", async (req, res) => {
  const sessionId = req.cookies.session;
  if (!sessionId) return res.status(401).json({ error: "Non connecté" });

  const session = await lucia.validateSession(sessionId);
  if (!session || !session.user)
    return res.status(401).json({ error: "Session invalide" });

  res.json({ user: session.user });
});

router.get("/debug/users", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  res.json(users);
});
export default router;
