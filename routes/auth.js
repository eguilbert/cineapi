import express from "express";
import bcrypt from "bcrypt";
import { lucia } from "../lib/lucialucia";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(400).json({ error: "Email déjà utilisé" });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      hashedPassword,
      username,
      role: "INVITE",
    },
  });

  const session = await lucia.createSession(user.id);
  res.cookie("session", session.id, lucia.sessionCookie.attributes);
  return res.json({ user });
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
