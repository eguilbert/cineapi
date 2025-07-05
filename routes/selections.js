const express = require("express");
const { PrismaClient } = require("@prisma/client");
const router = express.Router();
const prisma = new PrismaClient();

// GET all selections with full film detail
router.get("/", async (req, res) => {
  const selections = await prisma.selection.findMany({
    include: {
      films: {
        include: {
          film: {
            include: {
              director: true,
              productionCountries: {
                include: {
                  country: true,
                },
              },
              filmTags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
      },
    },
  });
  // Post-traitement : ne garder que ce qui t'intéresse
  const result = selections.map((selection) => ({
    id: selection.id,
    name: selection.name,
    films: selection.films.map((f) => ({
      title: f.film.title,
      category: f.film.category,
      poster: f.film.posterUrl,
      tmdbId: f.film.tmdbId,
      actors: f.film.actors,
      origin: f.film.origin,
      synopsis: f.film.synopsis,
      genre: f.film.genre,
      duration: f.film.duration,
      releaseDate: f.film.releaseDate,
      directorName: f.film.director?.name || null,
      tags: f.film.filmTags?.map((ft) => ft.tag.label) || [],
      firstProductionCountryName:
        f.film.productionCountries?.[0]?.country?.name || null,
    })),
  }));

  res.json(result);
});

// GET /api/selections/:id
router.get("/:id", async (req, res) => {
  const selection = await prisma.selection.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      films: {
        include: {
          film: {
            include: {
              director: true,
              productionCountries: {
                include: {
                  country: true,
                },
              },
              filmTags: {
                include: {
                  tag: true,
                },
              },
            },
          },
        },
      },
    },
  });
  const result = {
    id: selection.id,
    name: selection.name,
    films: selection.films.map((f) => ({
      title: f.film.title,
      category: f.film.category,
      poster: f.film.posterUrl,
      tmdbId: f.film.tmdbId,
      actors: f.film.actors,
      origin: f.film.origin,
      synopsis: f.film.synopsis,
      genre: f.film.genre,
      duration: f.film.duration,
      releaseDate: f.film.releaseDate,
      seances: f.film.seances,
      directorName: f.film.director?.name || null,
      tags: f.film.filmTags?.map((ft) => ft.tag.label) || [],
      firstProductionCountryName:
        f.film.productionCountries?.[0]?.country?.name || null,
    })),
  };
  res.json(result);
});

// POST /api/selections
router.post("/", async (req, res) => {
  const { name, films } = req.body;

  try {
    // 1. Créer la sélection
    const selection = await prisma.selection.create({
      data: { name },
    });

    // 2. Pour chaque film, upsert + lier à la sélection
    for (const f of films) {
      // 2a. Créer ou récupérer le film global
      const film = await prisma.film.upsert({
        where: { tmdbId: f.tmdbId },
        update: {},
        create: {
          tmdbId: f.tmdbId,
          title: f.title,
          genre: f.genre,
          synopsis: f.synopsis,
          duration: f.duration,
          origin: f.origin,
          actors: f.actors,
          posterUrl: f.posterUrl,
          releaseDate: f.releaseDate ? new Date(f.releaseDate) : null,
          budget: f.budget || null,
        },
      });

      // 2b. Créer le lien vers la sélection avec les champs contextuels
      await prisma.selectionFilm.create({
        data: {
          filmId: film.id,
          selectionId: selection.id,
          note: f.rating || null,
          commentaire: f.commentaire || null,
          category: f.category || null,
        },
      });
    }

    // 3. Recharger la sélection complète avec les films associés
    const fullSelection = await prisma.selection.findUnique({
      where: { id: selection.id },
      include: {
        films: {
          include: {
            film: true,
          },
        },
      },
    });

    res.json(fullSelection);
  } catch (err) {
    console.error("Erreur création sélection:", err.message);
    res.status(500).json({ error: "Erreur création sélection" });
  }
});

// PUT update selection
router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { films = [] } = req.body; // tableau de films à ajouter

  for (const f of films) {
    const exists = await prisma.selectionFilm.findUnique({
      where: {
        filmId_selectionId: {
          filmId: f.id,
          selectionId: Number(id),
        },
      },
    });

    if (!exists) {
      await prisma.selectionFilm.create({
        data: {
          filmId: f.id,
          selectionId: Number(id),
          note: f.note || null,
          commentaire: f.commentaire || null,
          category: f.category || null,
        },
      });
    }
  }

  res.json(updated);
});

// DELETE /api/selections/:id
router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const existing = await prisma.selection.findUnique({
      where: { id: Number(id) },
    });

    if (!existing) {
      return res.status(404).json({ error: "Sélection introuvable" });
    }
    // Supprime les liens entre la sélection et les films (dans la table pivot)
    await prisma.selectionFilm.deleteMany({
      where: { id: Number(id) },
    });

    // await prisma.selection.update({
    //   where: { id: Number(req.params.id) },
    //   data: {
    //     films: {
    //       set: [], // déconnecte tous les films liés
    //     },
    //   },
    // });

    // Supprimer la sélection elle-même
    await prisma.selection.delete({
      where: {
        id: Number(id),
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Erreur suppression sélection :", error.message);
    res.status(500).json({ error: "Erreur suppression sélection" });
  }
});

module.exports = router;
