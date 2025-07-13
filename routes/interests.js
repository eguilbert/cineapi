import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

import { verifySupabaseToken } from "../lib/verifySupabaseToken.js";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const DEFAULT_CINEMA_ID = "2";

// POST /api/interests
router.post("/", async (req, res) => {
  const { filmId, value } = req.body;
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    // ✅ Vérifie le JWT reçu depuis Supabase Auth
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.sub; // ID Supabase de l'utilisateur connecté

    // ✅ Assure-toi que le user profile existe
    await prisma.userProfile.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId, cinemaId: parseInt(DEFAULT_CINEMA_ID, 10) },
    });

    // ✅ Upsert l'intérêt pour le film
    const interest = await prisma.interest.upsert({
      where: {
        user_id_film_id: {
          user_id: userId,
          film_id: filmId,
        },
      },
      update: {
        value,
      },
      create: {
        user_id: userId,
        film_id: filmId,
        value,
      },
    });

    res.json(interest);
  } catch (err) {
    console.error("Erreur JWT /api/interests :", err);
    res.status(401).json({ error: "Token invalide ou expiré" });
  }
});

//🔍 Retourne le nombre d’utilisateurs par niveau d’intérêt pour un film donné.
router.get("/film/:id", async (req, res) => {
  const filmId = parseInt(req.params.id, 10);
  if (isNaN(filmId)) return res.status(400).json({ error: "filmId invalide" });

  try {
    const results = await prisma.interest.groupBy({
      by: ["value"],
      where: { film_id: filmId },
      _count: { _all: true },
    });

    // Format lisible
    const counts = {
      SANS_OPINION: 0,
      NOT_INTERESTED: 0,
      CURIOUS: 0,
      MUST_SEE: 0,
    };

    results.forEach((r) => {
      counts[r.value] = r._count._all;
    });

    res.json({ filmId, interests: counts });
  } catch (err) {
    console.error("Erreur GET /api/interests/film/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//🔐 Retourne tous les intérêts de l’utilisateur connecté
// GET /api/interests/my
router.get("/my", async (req, res) => {
  const userId = verifySupabaseToken(req);
  if (!userId) {
    console.error("❌ Token déchiffré, mais pas d'userId");
    return res.status(401).json({ error: "Token invalide" });
  }
  const profile = await prisma.userProfile.findUnique({
    where: { user_id: userId },
  });
  if (!profile) {
    console.error("❌ Aucun UserProfile trouvé pour:", userId);
    return res.status(404).json({ error: "Profil non trouvé" });
  }
  try {
    const userId = verifySupabaseToken(req);

    console.log("✅ userId extrait du token:", userId);

    const interests = await prisma.interest.findMany({
      where: { user_id: userId },
      include: {
        film: true,
      },
    });

    res.json(interests);
  } catch (err) {
    console.error("Erreur GET /api/interests/my :", err.message);
    res.status(401).json({ error: "Token invalide ou manquant" });
  }
});

export default router;
