import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

import { verifySupabaseToken } from "../lib/verifySupabaseToken.js";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const DEFAULT_CINEMA_ID = "2";

router.use((req, res, next) => {
  console.log("Incoming request:", req.method, req.originalUrl);
  next();
});

// POST /api/interests
router.post("/", async (req, res) => {
  console.log("Début POST /api/interests, body:", req.body);

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
  console.log("Début Get /api/interests/my, body:", req.body);

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

// GET /api/interests/films?ids=12,45,78
router.get("/films", async (req, res) => {
  const idsParam = req.query.ids;

  if (!idsParam) {
    return res.status(400).json({ error: "Paramètre ids manquant" });
  }

  const filmIds = idsParam
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

  if (filmIds.length === 0) {
    return res.status(400).json({ error: "Paramètres ids invalides" });
  }

  try {
    const grouped = await prisma.interest.groupBy({
      by: ["film_id", "value"],
      where: {
        film_id: { in: filmIds },
      },
      _count: { _all: true },
    });

    // Format : { [film_id]: { SANS_OPINION: x, NOT_INTERESTED: y, ... } }
    const response = {};
    for (const group of grouped) {
      if (!response[group.film_id]) {
        response[group.film_id] = {
          SANS_OPINION: 0,
          NOT_INTERESTED: 0,
          CURIOUS: 0,
          MUST_SEE: 0,
        };
      }
      response[group.film_id][group.value] = group._count._all;
    }

    res.json(response);
  } catch (err) {
    console.error("Erreur GET /api/interests/films", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
