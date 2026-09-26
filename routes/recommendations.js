import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/jwt.js";
import { recommendFilm } from "../lib/recommendationV1.js";

const router = Router();
const admin = (req, res, next) => req.user.role === "ADMIN"
  ? next() : res.status(403).json({ error: "Accès administrateur requis" });
const canRead = (req, res, next) => req.user.role === "ADMIN" || req.user.cinemaId === Number(req.params.cinemaId)
  ? next() : res.status(403).json({ error: "Cinéma non autorisé" });
const termsValid = (value) => Array.isArray(value) && value.length <= 40 && value.every(
  (item) => typeof item === "string" && item.trim().length > 0 && item.length <= 80 && /[a-zA-ZÀ-ÿ0-9]/.test(item),
);

router.param("cinemaId", (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Identifiant de cinéma invalide" });
  next();
});

router.get("/cinemas/:cinemaId/profile", requireAuth, canRead, async (req, res) => {
  const profile = await prisma.cinemaProfile.findUnique({ where: { cinemaId: Number(req.params.cinemaId) } });
  res.json(profile ?? { cinemaId: Number(req.params.cinemaId), description: "", favoredTerms: [], avoidedTerms: [] });
});

router.put("/cinemas/:cinemaId/profile", requireAuth, admin, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId);
  const { description, favoredTerms, avoidedTerms } = req.body;
  if (!Number.isSafeInteger(cinemaId) || cinemaId <= 0 || typeof description !== "string" || description.length > 5000 || !termsValid(favoredTerms) || !termsValid(avoidedTerms))
    return res.status(400).json({ error: "Profil invalide" });
  try {
    const profile = await prisma.cinemaProfile.upsert({
      where: { cinemaId }, create: { cinemaId, description, favoredTerms, avoidedTerms },
      update: { description, favoredTerms, avoidedTerms },
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Impossible d'enregistrer le profil" });
  }
});

router.get("/cinemas/:cinemaId/recommendations", requireAuth, canRead, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId);
  const rows = await prisma.filmRecommendation.findMany({
    where: { cinemaId }, include: { film: { select: { id: true, title: true, posterUrl: true, releaseDate: true } }, feedback: true },
    orderBy: { generatedAt: "desc" }, take: 100,
  });
  res.json(rows);
});

router.post("/cinemas/:cinemaId/films/:filmId/recommendation", requireAuth, admin, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId);
  const filmId = Number(req.params.filmId);
  if (![cinemaId, filmId].every((id) => Number.isSafeInteger(id) && id > 0))
    return res.status(400).json({ error: "Identifiants invalides" });
  const [cinema, film, profile] = await Promise.all([
    prisma.cinema.findUnique({ where: { id: cinemaId } }),
    prisma.film.findUnique({ where: { id: filmId }, select: { id: true, genre: true, category: true, origin: true, keywords: true } }),
    prisma.cinemaProfile.findUnique({ where: { cinemaId } }),
  ]);
  if (!cinema || !film) return res.status(404).json({ error: "Cinéma ou film introuvable" });
  // Historical context is descriptive only. Never infer attendance for a new film
  // from a small cohort or treat attendance as a forecast.
  let attendanceHistory = null;
  if (film.category) {
    const projections = await prisma.filmProjection.findMany({
      where: { cinemaId, date: { lt: new Date() }, audienceCount: { not: null }, film: { category: film.category } },
      select: { filmId: true, audienceCount: true },
    });
    const filmCount = new Set(projections.map((p) => p.filmId)).size;
    if (projections.length >= 5 && filmCount >= 3) {
      attendanceHistory = {
        category: film.category,
        projectionCount: projections.length,
        filmCount,
        averagePerShow: Math.round(projections.reduce((sum, p) => sum + p.audienceCount, 0) / projections.length),
      };
    }
  }
  const data = recommendFilm(film, profile, attendanceHistory);
  const recommendation = await prisma.filmRecommendation.upsert({
    where: { cinemaId_filmId: { cinemaId, filmId } },
    create: { cinemaId, filmId, ...data },
    update: { ...data, generatedAt: new Date() },
  });
  res.json(recommendation);
});

router.put("/recommendations/:id/feedback", requireAuth, admin, async (req, res) => {
  const recommendationId = Number(req.params.id);
  const { decision, plannedShows, note } = req.body;
  if (!Number.isSafeInteger(recommendationId) || !["RETAINED", "DECLINED", "PENDING"].includes(decision) ||
      (plannedShows != null && (!Number.isSafeInteger(plannedShows) || plannedShows < 0)) ||
      (note != null && (typeof note !== "string" || note.length > 2000)))
    return res.status(400).json({ error: "Retour invalide" });
  const recommendation = await prisma.filmRecommendation.findUnique({ where: { id: recommendationId } });
  if (!recommendation) return res.status(404).json({ error: "Recommandation introuvable" });
  const data = { cinemaId: recommendation.cinemaId, decision, plannedShows: plannedShows ?? null, note: note ?? null };
  const feedback = await prisma.recommendationFeedback.upsert({
    where: { recommendationId }, create: { recommendationId, ...data }, update: data,
  });
  res.json(feedback);
});

export default router;
