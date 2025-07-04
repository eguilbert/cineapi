const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// POST /api/films
router.post("/", async (req, res) => {
  const film = await prisma.film.create({ data: req.body });
  res.json(film);
});

// PUT /api/films/:id
router.put("/:id", async (req, res) => {
  const { id } = req.params;
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

router.put("/:id/tags", async (req, res) => {
  const filmId = Number(req.params.id);
  const { commentaire, tags = [], category = "thematics" } = req.body;

  try {
    // 1. Mise à jour du commentaire
    await prisma.film.update({
      where: { id: filmId },
      data: { commentaire },
    });

    // 2. Créer ou retrouver les tags
    const tagRecords = await Promise.all(
      tags.map(async (label) => {
        const existing = await prisma.filmTag.findUnique({
          where: { label },
        });

        return existing
          ? existing
          : await prisma.filmTag.create({
              data: { label, category, validated: false },
            });
      })
    );

    // 3. Supprimer tous les liens existants
    await prisma.filmFilmTag.deleteMany({
      where: { filmId },
    });

    // 4. Créer les nouveaux liens
    await prisma.filmFilmTag.createMany({
      data: tagRecords.map((tag) => ({
        filmId,
        tagId: tag.id,
      })),
    });

    res.json({ message: "Film mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur mise à jour film:", error);
    res.status(500).json({ error: "Échec mise à jour film" });
  }
});

/* 
await prisma.award.create({
  data: {
    prize: "Palme d'or",
    festival: "Cannes",
    year: 2024,
    film: { connect: { id: filmId } },
  },
});

await prisma.externalLink.createMany({
  data: [
    {
      url: "https://www.allocine.fr/film/fichefilm_gen_cfilm=123.html",
      label: "Allociné",
      filmId,
    },
    {
      url: "https://fr.wikipedia.org/wiki/Film_xyz",
      label: "Wikipedia",
      filmId,
    },
  ],
});

 */

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
router.post("/api/films/:tmdbId/refresh", async (req, res) => {
  const tmdbId = Number(req.params.tmdbId);

  try {
    const detail = await axios.get(
      `https://api.themoviedb.org/3/movie/${tmdbId}`,
      {
        params: {
          api_key: process.env.TMDB_KEY,
          language: "fr-FR",
        },
      }
    );

    const updated = await prisma.film.update({
      where: { tmdbId },
      data: {
        title: detail.data.title || detail.data.original_title,
        releaseDate: detail.data.release_date
          ? new Date(detail.data.release_date)
          : null,
      },
    });

    res.json({ updated });
  } catch (e) {
    console.error("Erreur TMDB refresh", e.message);
    res.status(500).json({ error: "Erreur TMDB" });
  }
});

module.exports = router;
