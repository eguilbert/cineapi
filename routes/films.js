// routes/films.js
import { Router } from "express";
import axios from "axios";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../lib/requireAuth.js"; // <- ton middleware Lucia v3
import { computeAggregateScore, normalizeInterestStats } from "../lib/score.js";

// import { ensureUserProfile } from "../lib/ensureProfile.js"; // optionnel

const router = Router();
const TMDB_KEY = process.env.TMDB_API_KEY;

// --- Helpers --------------------------------------------------------------

function requireAdmin(req, res, next) {
  // role vient de getUserAttributes dans lib/lucia.js
  if (req.user?.role === "ADMIN") return next();
  return res.status(403).json({ error: "Accès admin requis" });
}

function parseIntParam(v) {
  const n = parseInt(v, 10);
  return Number.isInteger(n) ? n : null;
}

// --- Films CRUD -----------------------------------------------------------

// POST /api/films  (ADMIN)
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const film = await prisma.film.create({ data: req.body });
    res.json(film);
  } catch (e) {
    console.error("POST /films:", e);
    res.status(500).json({ error: "Création impossible" });
  }
});

// PUT /api/films/:id  (ADMIN)
router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseIntParam(req.params.id);
    if (!id) return res.status(400).json({ error: "ID invalide" });

    const updated = await prisma.film.update({
      where: { id },
      data: req.body,
    });
    res.json(updated);
  } catch (e) {
    console.error("PUT /films/:id:", e);
    res.status(500).json({ error: "Mise à jour impossible" });
  }
});

// PUT /api/films/:id/category  (ADMIN)
router.put("/:id/category", requireAuth, requireAdmin, async (req, res) => {
  try {
    const filmId = parseIntParam(req.params.id);
    const { category } = req.body || {};
    if (!filmId) return res.status(400).json({ error: "ID invalide" });

    const updated = await prisma.film.update({
      where: { id: filmId },
      data: { category },
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur mise à jour catégorie:", error);
    res.status(500).json({ error: "Impossible de mettre à jour la catégorie" });
  }
});

// --- Tags -----------------------------------------------------------------

// POST /api/films/:filmId/tags  (ADMIN) - upsert relations
router.post("/:filmId/tags", requireAuth, requireAdmin, async (req, res) => {
  try {
    const filmId = parseIntParam(req.params.filmId);
    const { tagIds } = req.body || {};

    if (!filmId || !Array.isArray(tagIds)) {
      return res.status(400).json({ error: "Missing or invalid data" });
    }

    const relations = tagIds.map((tagId) => ({ filmId, tagId }));

    const created = await Promise.all(
      relations.map((rel) =>
        prisma.filmFilmTag.upsert({
          where: { filmId_tagId: { filmId: rel.filmId, tagId: rel.tagId } },
          update: {},
          create: rel,
        })
      )
    );

    res.json(created);
  } catch (e) {
    console.error("POST /films/:filmId/tags:", e);
    res.status(500).json({ error: "Sauvegarde des tags impossible" });
  }
});

// GET /api/films/:filmId/tags (public)
router.get("/:filmId/tags", async (req, res) => {
  try {
    const filmId = parseIntParam(req.params.filmId);
    if (!filmId) return res.status(400).json({ error: "ID invalide" });

    const links = await prisma.filmFilmTag.findMany({
      where: { filmId },
      include: { tag: true },
    });

    res.json(links.map((ft) => ft.tag));
  } catch (e) {
    console.error("GET /films/:filmId/tags:", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- Listing / recherche --------------------------------------------------

// GET /api/films (public) ?query=...
router.get("/", async (req, res) => {
  try {
    const query = req.query.query || "";
    const films = await prisma.film.findMany({
      where: query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              {
                AND: [
                  { directorId: { not: null } },
                  {
                    director: {
                      is: { name: { contains: query, mode: "insensitive" } },
                    },
                  },
                ],
              },
            ],
          }
        : {},
      include: {
        director: true,
        filmTags: { include: { tag: true } },
        awards: true,
        externalLinks: true,
      },
    });

    const formatted = films.map((film) => ({
      ...film,
      tags: film.filmTags.map((ft) => ft.tag.label),
    }));

    res.json(formatted);
  } catch (e) {
    console.error("GET /films:", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- Meta / détails -------------------------------------------------------

// PUT /api/films/:id/details  (ADMIN)
router.put("/:id/details", requireAuth, async (req, res) => {
  const filmId = parseIntParam(req.params.id);
  if (!filmId) return res.status(400).json({ error: "ID invalide" });

  const {
    commentaire,
    rating,
    awards = [],
    tags = [], // (placeholder si tu veux traiter ici les tags plus tard)
    externalLinks = [],
  } = req.body || {};

  try {
    // 1. Màj champs simples
    await prisma.film.update({
      where: { id: filmId },
      data: { commentaire, rating },
    });

    // 2. Reset awards puis recréer
    await prisma.award.deleteMany({ where: { filmId } });
    if (awards.length > 0) {
      await prisma.award.createMany({
        data: awards.map((a) => ({
          filmId,
          prize: a.prize,
          festival: a.festival,
          year: a.year ?? null,
        })),
      });
    }

    // 3. Reset externalLinks puis recréer
    await prisma.externalLink.deleteMany({ where: { filmId } });
    if (externalLinks.length > 0) {
      await prisma.externalLink.createMany({
        data: externalLinks.map((l) => ({
          filmId,
          label: l.label,
          url: l.url,
        })),
      });
    }

    res.json({ message: "Film mis à jour avec succès (awards & links)" });
  } catch (error) {
    console.error("PUT /films/:id/details:", error);
    res.status(500).json({ error: "Échec mise à jour film" });
  }
});

// PUT /api/films/:id/meta  (ADMIN)
router.put("/:id/meta", requireAuth, requireAdmin, async (req, res) => {
  const filmId = parseIntParam(req.params.id);
  if (!filmId) return res.status(400).json({ error: "ID invalide" });

  const { awards = [], externalLinks = [], category } = req.body || {};

  try {
    await prisma.$transaction([
      prisma.award.deleteMany({ where: { filmId } }),
      prisma.externalLink.deleteMany({ where: { filmId } }),
      ...awards.map((a) => prisma.award.create({ data: { ...a, filmId } })),
      ...externalLinks.map((l) =>
        prisma.externalLink.create({ data: { ...l, filmId } })
      ),
    ]);

    await prisma.film.update({
      where: { id: filmId },
      data: { category },
    });

    res.json({ message: "Métadonnées film mises à jour" });
  } catch (e) {
    console.error("PUT /films/:id/meta:", e);
    res.status(500).json({ error: "Erreur sauvegarde métadonnées" });
  }
});

// --- TMDB refresh ---------------------------------------------------------

// POST /api/films/:tmdbId/refresh  (ADMIN)
router.post("/:tmdbId/refresh", requireAuth, requireAdmin, async (req, res) => {
  const tmdbId = parseIntParam(req.params.tmdbId);
  if (!tmdbId) return res.status(400).json({ error: "tmdbId invalide" });

  console.log(`🔄 Appel TMDB : https://api.themoviedb.org/3/movie/${tmdbId}`);

  try {
    // 1) Détails FR
    const detail = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      { params: { api_key: TMDB_KEY, language: "fr-FR" } }
    );

    // 2) Dates FR
    const releases = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`,
      { params: { api_key: TMDB_KEY } }
    );
    const frReleases = releases.data.results.find((r) => r.iso_3166_1 === "FR");
    const validRelease = frReleases?.release_dates.find(
      (rd) => rd.type === 2 || rd.type === 3
    );
    const releaseDate = validRelease?.release_date
      ? new Date(validRelease.release_date)
      : null;

    // 3) Traductions
    const translations = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}/translations`,
      { params: { api_key: TMDB_KEY } }
    );
    const fr = translations.data.translations.find((t) => t.iso_639_1 === "fr");

    // 4) Titre final
    const translatedTitle =
      fr?.data?.title && fr.data.title !== detail.data.original_title
        ? fr.data.title
        : detail.data.title || detail.data.original_title;

    // 5) Update
    const updated = await prisma.film.update({
      where: { tmdbId },
      data: { title: translatedTitle, releaseDate },
    });

    res.json({ updated });
  } catch (e) {
    console.error(
      "❌ Erreur TMDB refresh :",
      JSON.stringify(
        {
          message: e.message,
          code: e.code,
          response: e.response?.data,
          stack: e.stack,
        },
        null,
        2
      )
    );
    res.status(500).json({ error: "Erreur TMDB" });
  }
});

// --- Recherche rapide -----------------------------------------------------

// GET /api/films/search (public) ?q=...
router.get("/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const results = await prisma.film.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      take: 10,
    });
    res.json(results);
  } catch (e) {
    console.error("GET /films/search:", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- Commentaires ---------------------------------------------------------

// POST /api/films/:id/comment  (AUTH)
router.post("/:id/comment", requireAuth, async (req, res) => {
  try {
    const film_id = parseIntParam(req.params.id);
    const { commentaire } = req.body || {};
    if (!film_id || !commentaire) {
      return res.status(400).json({ error: "Champs requis manquants" });
    }

    const user_id = req.user.id;
    // optionnel :
    // await ensureUserProfile(user_id);

    const comment = await prisma.filmComment.upsert({
      where: { film_id_user_id: { film_id, user_id } },
      update: { commentaire },
      create: { film_id, user_id, commentaire },
    });

    await prisma.activityLog.create({
      data: {
        userId: user_id,
        action: "comment.create",
        targetId: film_id,
        context: commentaire.slice(0, 100),
      },
    });

    res.json(comment);
  } catch (err) {
    console.error("POST /films/:id/comment:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// DELETE /api/films/:id/comment  (AUTH) — supprime **mon** commentaire
router.delete("/:id/comment", requireAuth, async (req, res) => {
  try {
    const film_id = parseIntParam(req.params.id);
    const user_id = req.user.id;
    if (!film_id) return res.status(400).json({ error: "ID invalide" });

    await prisma.filmComment.delete({
      where: { film_id_user_id: { film_id, user_id } },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("DELETE /films/:id/comment:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// (Optionnel ADMIN) DELETE /api/films/:id/comment/:userId — suppression ciblée
router.delete("/:id/comment/:userId", requireAuth, async (req, res) => {
  try {
    const film_id = parseIntParam(req.params.id);
    const userId = req.params.userId;
    if (!film_id || !userId) {
      return res.status(400).json({ error: "Paramètres invalides" });
    }

    await prisma.filmComment.delete({
      where: { film_id_user_id: { film_id, user_id: userId } },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("DELETE /films/:id/comment/:userId:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// --- Score ---------------------------------------------------------------

// GET /api/films/:id/score (public)
router.get("/:id/score", async (req, res) => {
  const filmId = Number(req.params.id);
  if (Number.isNaN(filmId))
    return res.status(400).json({ error: "filmId invalide" });

  // récupère les compteurs d'intérêt en 1 requête
  const grouped = await prisma.interest.groupBy({
    by: ["value"],
    where: { film_id: filmId },
    _count: { _all: true },
  });
  console.log("---- Interets grouped:", grouped);
  const stats = normalizeInterestStats(
    Object.fromEntries(grouped.map((g) => [g.value, g._count._all]))
  );
  console.log("---- Interets stats:", stats);
  // récupère la note moyenne si tu l'utilises (sinon mets 0)
  const film = await prisma.film.findUnique({
    where: { id: filmId },
    select: { rating: true },
  });

  const score = computeAggregateScore(stats, film?.rating ?? 0);
  return res.json({ filmId, score, interestStats: stats });
});

export default router;
