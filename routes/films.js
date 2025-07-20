import express from "express";
import axios from "axios";
import { prisma } from "../lib/prisma.js";

import { Router } from "express";
const router = Router();
const TMDB_KEY = process.env.TMDB_API_KEY;

// POST /api/films
router.post("/", async (req, res) => {
  const film = await prisma.film.create({ data: req.body });
  res.json(film);
});

// PUT /api/films/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  console.log();
  const updated = await prisma.film.update({
    where: { id: Number(id) },
    data: req.body,
  });
  res.json(updated);
});

router.put("/:id/category", async (req, res) => {
  const filmId = Number(req.params.id);
  const { category } = req.body;

  try {
    const updated = await prisma.film.update({
      where: { id: filmId },
      data: { category },
    });

    res.json(updated);
  } catch (error) {
    console.error("Erreur mise à jour catégorie:", error.message);
    res.status(500).json({ error: "Impossible de mettre à jour la catégorie" });
  }
});

// POST /api/films/:filmId/tags
router.post("/:filmId/tags", async (req, res) => {
  const { tagIds } = req.body; // tableau de tagId
  const filmId = Number(req.params.filmId);

  if (!Array.isArray(tagIds) || !filmId) {
    return res.status(400).json({ error: "Missing or invalid data" });
  }

  const relations = tagIds.map((tagId) => ({
    filmId,
    tagId,
  }));

  // Upsert relation (empêche doublons)
  const createdTags = await Promise.all(
    relations.map((rel) =>
      prisma.filmFilmTag.upsert({
        where: { filmId_tagId: { filmId: rel.filmId, tagId: rel.tagId } },
        update: {},
        create: rel,
      })
    )
  );

  res.json(createdTags);
});

// GET /api/films/:filmId/tags
router.get("/:filmId/tags", async (req, res) => {
  const filmId = Number(req.params.filmId);

  const tags = await prisma.filmFilmTag.findMany({
    where: { filmId },
    include: {
      tag: true,
    },
  });

  res.json(tags.map((ft) => ft.tag));
});

router.get("/", async (req, res) => {
  const query = req.query.query || "";
  const films = await prisma.film.findMany({
    where: query
      ? {
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive",
              },
            },
            {
              AND: [
                { directorId: { not: null } }, // ← filtre sécurité
                {
                  director: {
                    is: {
                      name: {
                        contains: query,
                        mode: "insensitive",
                      },
                    },
                  },
                },
              ],
            },
          ],
        }
      : {},
    include: {
      director: true,
      filmTags: {
        include: {
          tag: true, // ← récupère les objets FilmTag liés
        },
      },
      awards: true,
      externalLinks: true,
    },
  });
  const formatted = films.map((film) => ({
    ...film,
    tags: film.filmTags.map((ft) => ft.tag.label),
  }));

  res.json(formatted);
});

router.put("/:id/details", async (req, res) => {
  const filmId = Number(req.params.id);
  const {
    commentaire,
    rating,
    awards = [],
    tags = [],
    externalLinks = [],
  } = req.body;

  try {
    // 1. Mettre à jour les champs simples
    // 1. Mettre à jour les champs simples
    await prisma.film.update({
      where: { id: filmId },
      data: { commentaire, rating },
    });
    console.log("Commentaire et Rating mis à jour :", filmId);

    // 2. Supprimer tous les awards existants
    await prisma.award.deleteMany({ where: { filmId } });
    console.log("Suppression awards :", filmId);

    // 3. Insérer les nouveaux awards
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

    // 4. Supprimer tous les externalLinks existants
    await prisma.externalLink.deleteMany({ where: { filmId } });

    // 5. Insérer les nouveaux externalLinks
    if (externalLinks.length > 0) {
      await prisma.externalLink.createMany({
        data: externalLinks.map((link) => ({
          filmId,
          label: link.label,
          url: link.url,
        })),
      });
    }

    // 6. Mettre à jour les tags
    res.json({ message: "Film mis à jour avec succès (awards & links)" });
  } catch (error) {
    console.error("Erreur mise à jour film:", error);
    res.status(500).json({ error: "Échec mise à jour film" });
  }
});

router.put("/:id/meta", async (req, res) => {
  const filmId = Number(req.params.id);
  const { awards = [], externalLinks = [], category } = req.body;

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
    console.error(e);
    res.status(500).json({ error: "Erreur sauvegarde métadonnées" });
  }
});

router.post("/:tmdbId/refresh", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);
  console.log(`🔄 Appel TMDB : https://api.themoviedb.org/3/movie/${tmdbId}`);

  try {
    // 1. Détails du film en français
    const detail = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      {
        params: {
          api_key: TMDB_KEY,
          language: "fr-FR",
        },
      }
    );
    console.log("✅ TMDB reçu:", detail.data.title);
    // 2. Dates de sortie pour la France
    const releases = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`,
      {
        params: { api_key: TMDB_KEY },
      }
    );
    const frReleases = releases.data.results.find((r) => r.iso_3166_1 === "FR");
    const validRelease = frReleases?.release_dates.find((rd) => {
      return rd.type === 2 || rd.type === 3;
    });
    const releaseDate = validRelease?.release_date
      ? new Date(validRelease.release_date)
      : null;

    // 3. Traductions
    const translations = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}/translations`,
      { params: { api_key: TMDB_KEY } }
    );
    const fr = translations.data.translations.find((t) => t.iso_639_1 === "fr");

    // 4. Choix final du titre
    const translatedTitle =
      fr?.data?.title && fr.data.title !== detail.data.original_title
        ? fr.data.title
        : detail.data.title || detail.data.original_title;
    console.log("✅ titres possibles fr:", fr.data.title, detail.data.title);
    // 5. Mise à jour
    const updated = await prisma.film.update({
      where: { tmdbId },
      data: {
        title: translatedTitle,
        releaseDate,
      },
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
    process.stdout.write(""); // flush Docker logs
    res.status(500).json({ error: "Erreur TMDB" });
  }
});

router.get("/search", async (req, res) => {
  const q = req.query.q;
  if (!q) return res.json([]);

  const results = await prisma.film.findMany({
    where: {
      title: {
        contains: q,
        mode: "insensitive",
      },
    },
    take: 10,
  });

  res.json(results);
});

// POST /films/:id/comment
router.post("/:id/comment", async (req, res) => {
  const film_id = parseInt(req.params.id, 10);
  const { user_id, commentaire } = req.body;

  if (!user_id || !commentaire) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    const comment = await prisma.filmComment.upsert({
      where: {
        film_id_user_id: {
          film_id,
          user_id,
        },
      },
      update: {
        commentaire,
      },
      create: {
        film_id,
        user_id,
        commentaire,
      },
    });

    res.json(comment);
  } catch (err) {
    console.error("Erreur création/màj commentaire", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
