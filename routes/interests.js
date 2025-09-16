// routes/interests.js
import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/jwt.js";
import { ensureUserProfile } from "../lib/ensureProfile.js";
import { updateScoresForFilm } from "../lib/updateScores.js";

const router = Router();

router.use((req, _res, next) => {
  console.log("Incoming:", req.method, req.originalUrl);
  next();
});

/**
 * POST /api/interests
 * body: { filmId: number, value: "SANS_OPINION"|"NOT_INTERESTED"|"CURIOUS"|"MUST_SEE" }
 * Auth Lucia requise
 */
router.post("/", requireAuth, async (req, res) => {
  try {
    const { filmId, value } = req.body || {};
    if (!Number.isInteger(filmId) || !value) {
      return res.status(400).json({ error: "filmId ou value manquants" });
    }

    const userId = req.user.userId;

    // Profil auto si absent
    await ensureUserProfile(userId);

    // Upsert de l’intérêt
    const interest = await prisma.interest.upsert({
      where: {
        user_id_film_id: {
          user_id: userId,
          film_id: filmId,
        },
      },
      update: { value },
      create: { user_id: userId, film_id: filmId, value },
    });

    // Log d’activité
    await prisma.activityLog.create({
      data: {
        userId,
        action: "interest.post",
        targetId: filmId,
        context: value,
      },
    });

    // Réponse immédiate
    res.json(interest);

    // Mise à jour asynchrone du score (pas bloquant pour la réponse)
    updateScoresForFilm(filmId).catch((e) =>
      console.error("updateScoresForFilm error:", e)
    );
  } catch (err) {
    console.error("POST /api/interests erreur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /api/interests/film/:id
 * Public (pas besoin d’auth)
 */
router.get("/film/:id", async (req, res) => {
  const filmId = parseInt(req.params.id, 10);
  if (Number.isNaN(filmId)) {
    return res.status(400).json({ error: "filmId invalide" });
  }

  try {
    const results = await prisma.interest.groupBy({
      by: ["value"],
      where: { film_id: filmId },
      _count: { _all: true },
    });

    const ALLOWED = new Set([
      "SANS_OPINION",
      "NOT_INTERESTED",
      "CURIOUS",
      "MUST_SEE",
      "VERY_INTERESTED",
    ]);

    // Initialisation des compteurs à zéro
    const counts = {};
    for (const key of ALLOWED) counts[key] = 0;

    // Remplissage avec les valeurs trouvées
    for (const r of results) {
      if (ALLOWED.has(r.value)) {
        counts[r.value] = r._count._all;
      }
    }
    res.json({ filmId, interests: counts });
  } catch (err) {
    console.error("GET /api/interests/film/:id erreur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /api/interests/my
 * Auth Lucia requise
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // (facultatif) vérifier que le profil existe
    const profile = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!profile) {
      return res.status(404).json({ error: "Profil non trouvé" });
    }

    const interests = await prisma.interest.findMany({
      where: { user_id: userId },
      include: { film: true },
    });

    res.json(interests);
  } catch (err) {
    console.error("GET /api/interests/my erreur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * GET /api/interests/films?ids=1,2,3
 * Agrégation par film (public)
 */
router.get("/films", async (req, res) => {
  const idsParam = req.query.ids;
  if (!idsParam) {
    return res.status(400).json({ error: "Paramètre ids manquant" });
  }

  const filmIds = String(idsParam)
    .split(",")
    .map((id) => parseInt(id, 10))
    .filter((n) => Number.isInteger(n));

  if (filmIds.length === 0) {
    return res.status(400).json({ error: "Paramètres ids invalides" });
  }

  try {
    const grouped = await prisma.interest.groupBy({
      by: ["film_id", "value"],
      where: { film_id: { in: filmIds } },
      _count: { _all: true },
    });

    const response = {};
    for (const g of grouped) {
      response[g.film_id] ??= {
        SANS_OPINION: 0,
        NOT_INTERESTED: 0,
        CURIOUS: 0,
        MUST_SEE: 0,
        VERY_INTERESTED: 0,
      };
      response[g.film_id][g.value] = g._count._all;
    }

    res.json(response);
  } catch (err) {
    console.error("GET /api/interests/films erreur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

/**
 * POST /api/interests/films
 * body: { ids: number[] }
 * Agrégation par film (public)
 */
router.post("/films", async (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "Liste d’IDs manquante ou invalide" });
  }

  const filmIds = ids.filter((n) => Number.isInteger(n));
  if (filmIds.length === 0) {
    return res.status(400).json({ error: "Aucun ID de film valide" });
  }

  try {
    const grouped = await prisma.interest.groupBy({
      by: ["film_id", "value"],
      where: { film_id: { in: filmIds } },
      _count: { _all: true },
    });

    const response = {};
    for (const g of grouped) {
      response[g.film_id] ??= {
        SANS_OPINION: 0,
        NOT_INTERESTED: 0,
        CURIOUS: 0,
        MUST_SEE: 0,
        VERY_INTERESTED: 0,
      };
      response[g.film_id][g.value] = g._count._all;
    }

    res.json(response);
  } catch (err) {
    console.error("POST /api/interests/films erreur:", err);
    res.status(500).json({ error: "Erreur serveur lors de l’agrégation" });
  }
});

export default router;
