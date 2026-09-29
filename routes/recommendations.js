import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/jwt.js";
import { recommendFilm } from "../lib/recommendationV1.js";
import { attendancePortrait } from "../lib/attendancePortrait.js";
import { researchFilm } from "../lib/filmResearch.js";
import { researchConfigured, startCriticalResearch, retrieveCriticalResearch, formatCriticalResearch, suggestCriticalTags, normalizeCriticalTags } from "../lib/criticalResearch.js";

const router = Router();
const admin = (req, res, next) => req.user.role === "ADMIN"
  ? next() : res.status(403).json({ error: "Accès administrateur requis" });
const canRead = (req, res, next) => req.user.role === "ADMIN" || req.user.cinemaId === Number(req.params.cinemaId)
  ? next() : res.status(403).json({ error: "Cinéma non autorisé" });
const termsValid = (value) => Array.isArray(value) && value.length <= 40 && value.every(
  (item) => typeof item === "string" && item.trim().length > 0 && item.length <= 80 && /[a-zA-ZÀ-ÿ0-9]/.test(item),
);

const researchFilmSelect = {
  tmdbId: true, genre: true, category: true, origin: true, keywords: true,
  filmTags: { select: { tag: { select: { label: true } } } },
};

async function ensureRecommendation(cinemaId, filmId, film, selectedCategory) {
  const existing = await prisma.filmRecommendation.findUnique({ where: { cinemaId_filmId: { cinemaId, filmId } } });
  if (existing) return existing;
  const category = selectedCategory || film.category;
  const [profile, projections] = await Promise.all([
    prisma.cinemaProfile.findUnique({ where: { cinemaId } }),
    category ? prisma.filmProjection.findMany({
      where: { cinemaId, date: { lt: new Date() }, audienceCount: { not: null }, film: { category } },
      select: { filmId: true, audienceCount: true },
    }) : [],
  ]);
  const filmCount = new Set(projections.map((p) => p.filmId)).size;
  const attendanceHistory = projections.length >= 5 && filmCount >= 3 ? {
    category, filmCount, projectionCount: projections.length,
    averagePerShow: Math.round(projections.reduce((sum, p) => sum + p.audienceCount, 0) / projections.length),
  } : null;
  const data = recommendFilm({ ...film, category }, profile, attendanceHistory);
  return prisma.filmRecommendation.upsert({
    where: { cinemaId_filmId: { cinemaId, filmId } },
    create: { cinemaId, filmId, ...data }, update: {},
  });
}

router.param("cinemaId", (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).json({ error: "Identifiant de cinéma invalide" });
  next();
});

router.get('/critical-analysis/availability', requireAuth, admin, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    available: researchConfigured(),
    environment: process.env.RAILWAY_ENVIRONMENT_NAME || null,
    environmentId: process.env.RAILWAY_ENVIRONMENT_ID || null,
    service: process.env.RAILWAY_SERVICE_NAME || null,
    serviceId: process.env.RAILWAY_SERVICE_ID || null,
  });
});

// Analyses publiées dans les fiches de films : lecture seule pour tout compte connecté.
router.get('/selections/:selectionId/critical-analyses', requireAuth, async (req, res) => {
  const selectionId = Number(req.params.selectionId);
  if (!Number.isSafeInteger(selectionId) || selectionId <= 0)
    return res.status(400).json({ error: 'Sélection invalide' });
  try {
    const selection = await prisma.selection.findUnique({
      where: { id: selectionId }, select: { films: { select: { filmId: true } } },
    });
    if (!selection) return res.status(404).json({ error: 'Sélection introuvable' });
    const filmIds = selection.films.map(({ filmId }) => filmId);
    if (!filmIds.length) return res.json([]);
    const rows = await prisma.filmRecommendation.findMany({
      where: { filmId: { in: filmIds } },
      select: { filmId: true, cinemaId: true, evidence: true, cinema: { select: { name: true } } },
    });
    res.json(rows.filter((row) => row.evidence?.criticalAnalysis).map((row) => ({
      filmId: row.filmId, cinemaId: row.cinemaId,
      cinemaName: row.cinema.name, analysis: row.evidence.criticalAnalysis,
    })));
  } catch (error) {
    console.error('Lecture des analyses impossible:', error);
    res.status(500).json({ error: 'Analyses indisponibles' });
  }
});

router.get("/cinemas/:cinemaId/profile", requireAuth, canRead, async (req, res) => {
  const profile = await prisma.cinemaProfile.findUnique({ where: { cinemaId: Number(req.params.cinemaId) } });
  res.json(profile ?? { cinemaId: Number(req.params.cinemaId), description: "", favoredTerms: [], avoidedTerms: [] });
});

router.get("/cinemas/:cinemaId/attendance-portrait", requireAuth, canRead, async (req, res) => {
  const projections = await prisma.filmProjection.findMany({
    where: { cinemaId: Number(req.params.cinemaId), date: { lt: new Date() }, audienceCount: { not: null } },
    select: { filmId: true, audienceCount: true, film: { select: { title: true, category: true } } },
  });
  res.json(attendancePortrait(projections));
});

router.post("/cinemas/:cinemaId/films/:filmId/research", requireAuth, admin, async (req, res) => {
  const filmId = Number(req.params.filmId);
  if (!Number.isSafeInteger(filmId) || filmId <= 0) return res.status(400).json({ error: "Film invalide" });
  const film = await prisma.film.findUnique({ where: { id: filmId }, select: researchFilmSelect });
  if (!film) return res.status(404).json({ error: "Film introuvable" });
  try {
    const existing = await ensureRecommendation(Number(req.params.cinemaId), filmId, film);
    const research = await researchFilm(film);
    const updated = await prisma.filmRecommendation.update({ where: { id: existing.id }, data: { evidence: { ...existing.evidence, research } } });
    res.json(updated);
  } catch (error) {
    console.error("Recherche TMDB impossible:", error.message);
    res.status(502).json({ error: "Recherche TMDB indisponible. Réessayez plus tard." });
  }
});

router.post("/cinemas/:cinemaId/films/:filmId/critical-analysis", requireAuth, admin, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId), filmId = Number(req.params.filmId);
  if (!Number.isSafeInteger(filmId) || filmId <= 0) return res.status(400).json({ error: "Film invalide" });
  if (!researchConfigured()) return res.status(503).json({ error: "Analyse cinéphile indisponible : configurer OPENAI_API_KEY sur Railway." });
  const film = await prisma.film.findUnique({ where: { id: filmId }, include: { director: true, filmTags: { include: { tag: true } } } });
  if (!film) return res.status(404).json({ error: "Film introuvable" });
  try {
    const recommendation = await ensureRecommendation(cinemaId, filmId, film);
    if (recommendation.evidence?.criticalJob && !req.body?.refresh)
      return res.json({ status: 'in_progress' });
    const [profile, projections] = await Promise.all([
      prisma.cinemaProfile.findUnique({ where: { cinemaId }, include: { cinema: { select: { name: true } } } }),
      prisma.filmProjection.findMany({
        where: { cinemaId, date: { lt: new Date() }, audienceCount: { not: null } },
        select: { filmId: true, audienceCount: true, film: { select: { title: true, category: true } } },
      }),
    ]);
    const response = await startCriticalResearch(film, profile, attendancePortrait(projections));
    const evidence = { ...recommendation.evidence, criticalJob: response.id };
    if (req.body?.refresh) delete evidence.criticalAnalysis;
    await prisma.filmRecommendation.update({ where: { id: recommendation.id }, data: { evidence } });
    res.json({ status: 'in_progress' });
  } catch (error) {
    console.error('Analyse cinéphile impossible:', error.message);
    res.status(502).json({ error: "Impossible de lancer l'analyse cinéphile." });
  }
});

router.get("/cinemas/:cinemaId/films/:filmId/critical-analysis", requireAuth, canRead, async (req, res) => {
  const filmId = Number(req.params.filmId);
  if (!Number.isSafeInteger(filmId) || filmId <= 0) return res.status(400).json({ error: "Film invalide" });
  const recommendation = await prisma.filmRecommendation.findUnique({ where: {
    cinemaId_filmId: { cinemaId: Number(req.params.cinemaId), filmId },
  } });
  if (!recommendation) return res.json({ status: 'absent' });
  const { criticalJob, criticalAnalysis } = recommendation.evidence || {};
  if (!criticalJob) return res.json(criticalAnalysis ? { status: 'completed', analysis: criticalAnalysis } : { status: 'absent' });
  if (!researchConfigured()) return res.status(503).json({ error: "Analyse cinéphile indisponible : OPENAI_API_KEY manquante." });
  try {
    const response = await retrieveCriticalResearch(criticalJob);
    if (['queued', 'in_progress'].includes(response.status)) return res.json({ status: response.status });
    const evidence = { ...recommendation.evidence };
    delete evidence.criticalJob;
    if (response.status !== 'completed') {
      await prisma.filmRecommendation.update({ where: { id: recommendation.id }, data: { evidence } });
      return res.status(502).json({ error: "L'analyse a échoué ; vous pouvez la relancer." });
    }
    evidence.criticalAnalysis = formatCriticalResearch(response);
    await prisma.filmRecommendation.update({ where: { id: recommendation.id }, data: { evidence } });
    res.json({ status: 'completed', analysis: evidence.criticalAnalysis });
  } catch (error) {
    console.error('Récupération analyse cinéphile impossible:', error.message);
    res.status(502).json({ error: "Impossible de récupérer l'analyse ; réessayez dans un instant." });
  }
});

router.post('/cinemas/:cinemaId/films/:filmId/critical-analysis/tags/suggest', requireAuth, admin, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId), filmId = Number(req.params.filmId);
  if (!Number.isSafeInteger(filmId) || filmId <= 0) return res.status(400).json({ error: 'Film invalide' });
  if (!researchConfigured()) return res.status(503).json({ error: 'Analyse indisponible : clé API absente.' });
  const recommendation = await prisma.filmRecommendation.findUnique({ where: { cinemaId_filmId: { cinemaId, filmId } } });
  const analysis = recommendation?.evidence?.criticalAnalysis;
  if (!analysis) return res.status(404).json({ error: 'Analyse absente' });
  if (analysis.tags?.length) return res.json({ analysis });
  try {
    const tags = await suggestCriticalTags(analysis);
    const updatedAnalysis = { ...analysis, tags };
    await prisma.filmRecommendation.update({ where: { id: recommendation.id },
      data: { evidence: { ...recommendation.evidence, criticalAnalysis: updatedAnalysis } } });
    res.json({ analysis: updatedAnalysis });
  } catch (error) {
    console.error('Extraction des tags impossible:', error);
    res.status(502).json({ error: 'Impossible de proposer des tags pour ce film.' });
  }
});

router.post('/cinemas/:cinemaId/films/:filmId/critical-analysis/tags/apply', requireAuth, admin, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId), filmId = Number(req.params.filmId);
  if (!Number.isSafeInteger(filmId) || filmId <= 0) return res.status(400).json({ error: 'Film invalide' });
  const recommendation = await prisma.filmRecommendation.findUnique({ where: { cinemaId_filmId: { cinemaId, filmId } } });
  const analysis = recommendation?.evidence?.criticalAnalysis;
  if (!analysis) return res.status(404).json({ error: 'Analyse absente' });
  const proposed = normalizeCriticalTags(analysis.tags);
  const requested = Array.isArray(req.body?.labels) ? req.body.labels : proposed.map(({ label }) => label);
  const tags = proposed.filter(({ label }) => requested.includes(label));
  if (!tags.length) return res.status(400).json({ error: 'Aucun tag proposé' });
  try {
    const applied = await prisma.$transaction(async (tx) => {
      const linked = [];
      for (const { label, category } of tags) {
        const existing = await tx.filmTag.findFirst({ where: { label: { equals: label, mode: 'insensitive' } } });
        const tag = existing || await tx.filmTag.upsert({ where: { label }, update: {},
          create: { label, category, validated: true } });
        linked.push(tag);
      }
      await tx.filmFilmTag.createMany({ data: linked.map(({ id }) => ({ filmId, tagId: id })), skipDuplicates: true });
      return linked;
    });
    const updatedAnalysis = { ...analysis, appliedTags: tags.map(({ label }) => label), tagsAppliedAt: new Date().toISOString() };
    await prisma.filmRecommendation.update({ where: { id: recommendation.id },
      data: { evidence: { ...recommendation.evidence, criticalAnalysis: updatedAnalysis } } });
    res.json({ analysis: updatedAnalysis, tags: applied });
  } catch (error) {
    console.error('Ajout des tags impossible:', error);
    res.status(500).json({ error: 'Impossible de lier les tags au film.' });
  }
});

router.get('/cinemas/:cinemaId/films/:filmId/comparable-attendance', requireAuth, canRead, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId), filmId = Number(req.params.filmId);
  if (!Number.isSafeInteger(filmId) || filmId <= 0) return res.status(400).json({ error: 'Film invalide' });
  try {
    const [film, recommendation] = await Promise.all([
      prisma.film.findUnique({ where: { id: filmId }, select: {
        filmTags: { select: { tag: { select: { label: true } } } },
      } }),
      prisma.filmRecommendation.findUnique({ where: { cinemaId_filmId: { cinemaId, filmId } }, select: { evidence: true } }),
    ]);
    if (!film) return res.status(404).json({ error: 'Film introuvable' });
    const labels = [...new Set([
      ...film.filmTags.map(({ tag }) => tag.label),
      ...normalizeCriticalTags(recommendation?.evidence?.criticalAnalysis?.tags).map(({ label }) => label),
    ].map((label) => label.toLocaleLowerCase('fr')))];
    if (labels.length < 2) return res.json({ targetTags: labels, films: [] });
    const projections = await prisma.filmProjection.findMany({
      where: { cinemaId, filmId: { not: filmId }, date: { lt: new Date() }, audienceCount: { not: null },
        film: { filmTags: { some: { tag: { label: { in: labels, mode: 'insensitive' } } } } } },
      select: { filmId: true, date: true, audienceCount: true, film: { select: {
        title: true, releaseDate: true, filmTags: { select: { tag: { select: { label: true } } } },
      } } },
    });
    const byFilm = new Map();
    for (const projection of projections) {
      let item = byFilm.get(projection.filmId);
      if (!item) {
        const sharedTags = [...new Set(projection.film.filmTags.map(({ tag }) => tag.label)
          .filter((label) => labels.includes(label.toLocaleLowerCase('fr'))))];
        if (sharedTags.length < 2) continue;
        item = { filmId: projection.filmId, title: projection.film.title,
          sharedTags, projectionCount: 0, totalAdmissions: 0 };
        byFilm.set(projection.filmId, item);
      }
      item.projectionCount++;
      item.totalAdmissions += projection.audienceCount;
    }
    const films = [...byFilm.values()].map((item) => ({ ...item,
      averagePerShow: Math.round(item.totalAdmissions / item.projectionCount),
    })).sort((a, b) => b.sharedTags.length - a.sharedTags.length || b.projectionCount - a.projectionCount).slice(0, 8);
    res.json({ targetTags: labels, films });
  } catch (error) {
    console.error('Films comparables indisponibles:', error);
    res.status(500).json({ error: 'Films comparables indisponibles' });
  }
});

router.post("/cinemas/:cinemaId/selections/:selectionId/research", requireAuth, admin, async (req, res) => {
  const selectionId = Number(req.params.selectionId);
  if (!Number.isSafeInteger(selectionId) || selectionId <= 0) return res.status(400).json({ error: "Sélection invalide" });
  const requestedOffset = Number(req.body?.offset ?? 0);
  if (!Number.isSafeInteger(requestedOffset) || requestedOffset < 0) return res.status(400).json({ error: "Position invalide" });
  const selection = await prisma.selection.findUnique({ where: { id: selectionId }, select: { films: { select: { filmId: true, category: true, film: { select: { category: true } } } } } });
  if (!selection) return res.status(404).json({ error: "Sélection introuvable" });
  const categoryOf = (row) => row.category || row.film.category || 'Sans catégorie';
  const priority = (category) => /art\s*(?:et|&)\s*essai/i.test(category) ? 0 : /docu/i.test(category) ? 1 : 2;
  const films = selection.films.sort((a, b) =>
    priority(categoryOf(a)) - priority(categoryOf(b)) ||
    categoryOf(a).localeCompare(categoryOf(b), 'fr') || a.filmId - b.filmId);
  const category = films[requestedOffset] ? categoryOf(films[requestedOffset]) : null;
  let end = requestedOffset;
  while (end < films.length && end - requestedOffset < 12 && categoryOf(films[end]) === category) end++;
  const currentBatch = films.slice(requestedOffset, end);
  const results = [];
  for (let offset = 0; offset < currentBatch.length; offset += 4) {
    const batch = await Promise.all(currentBatch.slice(offset, offset + 4).map(async ({ filmId, category: selectedCategory }) => {
      try {
        const film = await prisma.film.findUnique({ where: { id: filmId }, select: researchFilmSelect });
        if (!film) return { filmId, error: "Film introuvable" };
        const existing = await ensureRecommendation(Number(req.params.cinemaId), filmId, film, selectedCategory);
        const research = await researchFilm(film);
        await prisma.filmRecommendation.update({ where: { id: existing.id }, data: { evidence: { ...existing.evidence, research } } });
        return { filmId, ok: true };
      } catch (error) {
        console.error(`Recherche du film ${filmId} impossible:`, error.message);
        return { filmId, error: "Recherche TMDB ou enregistrement indisponible" };
      }
    }));
    results.push(...batch);
  }
  res.json({ results, total: films.length, nextOffset: end < films.length ? end : null, category });
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
    orderBy: { generatedAt: "desc" }, take: 500,
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

router.post("/cinemas/:cinemaId/selections/:selectionId/recommendations", requireAuth, admin, async (req, res) => {
  const cinemaId = Number(req.params.cinemaId);
  const selectionId = Number(req.params.selectionId);
  if (![cinemaId, selectionId].every((id) => Number.isSafeInteger(id) && id > 0))
    return res.status(400).json({ error: "Identifiants invalides" });

  try {
    const [cinema, selection, profile] = await Promise.all([
      prisma.cinema.findUnique({ where: { id: cinemaId }, select: { id: true } }),
      prisma.selection.findUnique({
        where: { id: selectionId },
        select: {
          id: true,
          films: { select: { category: true, film: { select: {
            id: true, title: true, genre: true, category: true, origin: true, keywords: true,
          } } } },
        },
      }),
      prisma.cinemaProfile.findUnique({ where: { cinemaId } }),
    ]);
    if (!cinema || !selection) return res.status(404).json({ error: "Cinéma ou sélection introuvable" });
    if (selection.films.length > 150)
      return res.status(400).json({ error: "La sélection dépasse 150 films" });

    const categories = [...new Set(selection.films.map((sf) => sf.category || sf.film.category).filter(Boolean))];
    const pastProjections = categories.length ? await prisma.filmProjection.findMany({
      where: { cinemaId, date: { lt: new Date() }, audienceCount: { not: null }, film: { category: { in: categories } } },
      select: { filmId: true, audienceCount: true, film: { select: { category: true } } },
    }) : [];
    const history = new Map();
    for (const category of categories) {
      const rows = pastProjections.filter((p) => p.film.category === category);
      const filmCount = new Set(rows.map((p) => p.filmId)).size;
      if (rows.length >= 5 && filmCount >= 3) history.set(category, {
        category, filmCount, projectionCount: rows.length,
        averagePerShow: Math.round(rows.reduce((sum, p) => sum + p.audienceCount, 0) / rows.length),
      });
    }

    const rows = await prisma.$transaction(selection.films.map((sf) => {
      const film = { ...sf.film, category: sf.category || sf.film.category };
      const data = recommendFilm(film, profile, history.get(film.category) || null);
      return prisma.filmRecommendation.upsert({
        where: { cinemaId_filmId: { cinemaId, filmId: film.id } },
        create: { cinemaId, filmId: film.id, ...data },
        update: { ...data, generatedAt: new Date() },
      });
    }));
    res.json(rows.map((row, index) => ({ ...row, film: {
      id: selection.films[index].film.id, title: selection.films[index].film.title,
    } })));
  } catch (error) {
    console.error("Erreur analyse sélection:", error);
    res.status(500).json({ error: "Impossible d'analyser la sélection" });
  }
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
