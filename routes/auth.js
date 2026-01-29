import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { requireAuth } from "../middleware/jwt.js";

 */ import { prisma } from "../lib/prisma.js";
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
      username,
      role: "INVITE",
    });
    console.log("🔎 Types envoyés à Prisma:");
    console.log("email:", typeof email, email);
    console.log("username:", typeof username, username);
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

router.post("/login", async (req, res) => {
  const email = String(req.body.email || "")
    .toLowerCase()
    .trim();
  const password = String(req.body.password);

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Générer le token JWT
const token = jwt.sign(
  { userId: user.id, email: user.email, role: user.role }, // ✅ ajoute role
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN }
);

    // Renvoyer le token au frontend
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        cinemaId: user.cinemaId,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// POST /auth/logout
router.post("/logout", async (_req, res) => {
  // JWT: côté serveur rien à invalider (sauf blacklist/rotation)
  res.json({ ok: true });
});

// Récupérer l'utilisateur connecté
router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        username: true, // si tu as ce champ
        cinemaId: true, // si tu l’utilises
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
