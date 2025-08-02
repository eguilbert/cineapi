import express from "express";
import bcrypt from "bcrypt";
import { lucia } from "../lib/lucia.js";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  try {
    console.log("🔵 Reçu:", req.body);
    if ("id" in req.body) {
      console.warn("🚨 id détecté dans req.body !!!", req.body.id);
      //          throw new Error("Ne pas envoyer d'id !");
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

    console.log("🔐 Password hashashin");
    console.log("📦 Données envoyées à Prisma:", {
      email,
      hashedPassword,
      cleanUsername,
      role: "INVITE",
    });

    const user = await prisma.user.create({
      data: {
        email,
        hashedPassword,
        username: cleanUsername,
        role: "INVITE",
      },
    });
    /*     const session = await lucia.createSession(user.id);
    console.log("🔑 Session créée:", session.id); */

    /*     res.cookie("session", session.id, lucia.sessionCookie.attributes);
     */
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

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.hashedPassword) {
    return res.status(400).json({ error: "Email ou mot de passe incorrect" });
  }

  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) {
    return res.status(400).json({ error: "Email ou mot de passe incorrect" });
  }

  const session = await lucia.createSession(user.id);
  res.cookie("session", session.id, lucia.sessionCookie.attributes);
  return res.json({ user });
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

export default router;
