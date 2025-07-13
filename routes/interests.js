import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const prisma = new PrismaClient();

// Supabase server-side client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/", async (req, res) => {
  const { filmId, value } = req.body;
  const token = req.headers.authorization?.split("Bearer ")[1];

  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    // 1. Vérifie le token utilisateur
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: "Token invalide" });
    }

    const userId = user.id;

    // 2. S’assure que le UserProfile existe
    await prisma.userProfile.upsert({
      where: { user_id: userId },
      update: {},
      create: { user_id: userId },
    });

    // 3. Upsert l'intérêt utilisateur pour ce film
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
    console.error("Erreur POST /api/interests :", err);
    res.status(500).json({ error: "Erreur serveur" });
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
      _count: true,
    });

    // Format lisible
    const counts = {
      SANS_OPINION: 0,
      NOT_INTERESTED: 0,
      CURIOUS: 0,
      MUST_SEE: 0,
    };

    results.forEach((r) => {
      counts[r.value] = r._count;
    });

    res.json({ filmId, interests: counts });
  } catch (err) {
    console.error("Erreur GET /api/interests/film/:id", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

//🔐 Retourne tous les intérêts de l’utilisateur connecté
router.get("/my", async (req, res) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ error: "Token manquant" });

  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user)
      return res.status(401).json({ error: "Token invalide" });

    const interests = await prisma.interest.findMany({
      where: { user_id: user.id },
      include: {
        film: true,
      },
    });

    res.json(interests);
  } catch (err) {
    console.error("Erreur GET /api/interests/my", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
