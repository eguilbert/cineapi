import { prisma } from "../lib/prisma.js";
import { Router } from "express";
import {
  normalizeInterestStats,
  getInterestCount,
  computeAverageInterest,
  computePopularityScore,
} from "../lib/score.js";
import { requireSession } from "../middleware/lucia.js";
import { importFilmFromTmdb } from "../lib/importFilmFromTmdb.js";

const router = Router();

// GET all selections
router.get("/", async (req, res) => {
  try {
    const selections = await prisma.selection.findMany({
      select: {
        id: true,
        name: true,
        status: true,
      },
      orderBy: {
        date: "desc", // facultatif : pour afficher les plus récentes d'abord
      },
    });

    res.json(selections);
  } catch (err) {
    console.error("Erreur GET /api/selections :", err.message);
    res.status(500).json({ error: "Impossible de charger les sélections" });
  }
});

/* router.get("/:id", async (req, res) => {
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
              awards: true, // 👈 conservé
              externalLinks: true, // 👈 conservé
              comments: {
                include: {
                  user: {
                    select: {
                      username: true,
                      user_id: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!selection) {
    return res.status(404).json({ error: "Selection not found" });
  }

  // --- AJOUT: récupérer les stats d'intérêts pour TOUS les films en une fois
  const filmIds = selection.films.map((sf) => sf.film.id);
  let statsByFilm = {};

  if (filmIds.length) {
    // ⚠️ Selon ton schéma, remplace "film_id" par "filmId" si besoin.
    const grouped = await prisma.interest.groupBy({
      by: ["film_id", "value"], // ou ["filmId", "value"]
      where: { film_id: { in: filmIds } }, // ou { filmId: { in: filmIds } }
      _count: { _all: true },
    });

    // Regrouper -> { [filmId]: { CURIOUS: n, MUST_SEE: m, ... } }
    for (const g of grouped) {
      const fid = g.film_id ?? g.filmId;
      (statsByFilm[fid] ||= {})[g.value] = g._count._all;
    }
  }

  // --- Construction du payload (on garde tout ce que tu avais)
  const result = {
    id: selection.id,
    name: selection.name,
    films: selection.films.map((f) => {
      const stats = normalizeInterestStats(statsByFilm[f.film.id] || {});
      const votes = getInterestCount(stats);
      const avgScore = computeAverageInterest(stats); // lisibilité “1/2/3”
      const score = computePopularityScore(stats); // 🔥 popularité (somme)

      return {
        title: f.film.title,
        id: f.film.id,
        category: f.film.category,
        poster: f.film.posterUrl,
        tmdbId: f.film.tmdbId,
        actors: f.film.actors,
        origin: f.film.origin,
        synopsis: f.film.synopsis,
        genre: f.film.genre,
        duration: f.film.duration,
        releaseDate: f.film.releaseDate,
        trailerUrl: f.film.trailerUrl,
        selected: f.selected,
        awards:
          f.film.awards?.map((a) => ({
            prize: a.prize,
            festival: a.festival,
            year: a.year,
          })) || [],
        externalLinks:
          f.film.externalLinks?.map((l) => ({
            url: l.url,
            label: l.label,
          })) || [],
        commentaire: f.film.commentaire,
        score: f.score ?? null,
        rating: f.film.rating,
        directorName: f.film.director?.name || null,
        tags: f.film.filmTags?.map((ft) => ft.tag.label) || [],
        firstProductionCountryName:
          f.film.productionCountries?.[0]?.country?.name || null,
        // ✅ commentaires par utilisateur (conservé)
        comments:
          f.film.comments?.map((c) => ({
            user_id: c.user.user_id,
            username: c.user.username,
            commentaire: c.commentaire,
            createdAt: c.createdAt,
          })) || [],

        // ✅ AJOUTS live:
        interestStats: stats, // { SANS_OPINION:0, NOT_INTERESTED:0, ... }
        votes,
        avgScore, // lisible (1/2/3)
        score, // popularité (somme) — à utiliser pour trier/afficher la passion
      };
    }),
  };

  res.json(result);
}); */
router.get("/:id", async (req, res) => {
  const selection = await prisma.selection.findUnique({
    where: { id: Number(req.params.id) },
    include: {
      films: {
        include: {
          film: {
            include: {
              director: true,
              productionCountries: { include: { country: true } },
              filmTags: { include: { tag: true } },
              awards: true,
              externalLinks: true,
              comments: {
                include: {
                  user: { select: { username: true, user_id: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!selection) {
    return res.status(404).json({ error: "Selection not found" });
  }

  const filmIds = selection.films.map((sf) => sf.film.id);
  let statsByFilm = {};

  if (filmIds.length) {
    const grouped = await prisma.interest.groupBy({
      by: ["film_id", "value"], // ou ["filmId", "value"]
      where: { film_id: { in: filmIds } },
      _count: { _all: true },
    });

    for (const g of grouped) {
      const fid = g.film_id ?? g.filmId;
      (statsByFilm[fid] ||= {})[g.value] = g._count._all;
    }
  }

  const result = {
    id: selection.id,
    name: selection.name,
    films: selection.films.map((f) => {
      const stats = normalizeInterestStats(statsByFilm[f.film.id] || {});
      const votes = getInterestCount(stats);
      const avgScore = computeAverageInterest(stats);
      const liveScore = computePopularityScore(stats); // calcul instantané
      console.log(">>> liveScore", liveScore);
      return {
        id: f.film.id,
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
        trailerUrl: f.film.trailerUrl,
        commentaire: f.film.commentaire,
        rating: f.film.rating,
        directorName: f.film.director?.name || null,
        tags: f.film.filmTags?.map((ft) => ft.tag.label) || [],
        firstProductionCountryName:
          f.film.productionCountries?.[0]?.country?.name || null,

        // champs issus du pivot SelectionFilm
        selected: f.selected,
        storedScore: f.liveScore ?? null, // ✅ score persistant (après approbation)

        // awards & liens externes
        awards:
          f.film.awards?.map((a) => ({
            prize: a.prize,
            festival: a.festival,
            year: a.year,
          })) || [],
        externalLinks:
          f.film.externalLinks?.map((l) => ({
            url: l.url,
            label: l.label,
          })) || [],

        // commentaires
        comments:
          f.film.comments?.map((c) => ({
            user_id: c.user.user_id,
            username: c.user.username,
            commentaire: c.commentaire,
            createdAt: c.createdAt,
          })) || [],

        // AJOUTS live (calculés à la volée)
        interestStats: stats,
        votes,
        avgScore,
        liveScore, // ✅ calcul dynamique basé sur les intérêts
      };
    }),
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

  // Facultatif : retourner la sélection mise à jour
  const refreshed = await prisma.selection.findUnique({
    where: { id: Number(id) },
    include: {
      films: {
        include: {
          film: true,
        },
      },
    },
  });

  res.json(refreshed);
});

///api/selections/:id/add-film
// /api/selections/:id/add-film
router.post("/:id/add-film", async (req, res) => {
  const selectionId = Number(req.params.id);
  const { tmdbId, category } = req.body;

  let film = await prisma.film.findUnique({
    where: { tmdbId: Number(tmdbId) },
  });
  if (!film) {
    film = await importFilmFromTmdb(Number(tmdbId)); // ⇦ ici
  }

  const exists = await prisma.selectionFilm.findUnique({
    where: { filmId_selectionId: { filmId: film.id, selectionId } },
  });

  if (!exists) {
    await prisma.selectionFilm.create({
      data: { filmId: film.id, selectionId, category: category ?? null },
    });
  }

  res.json({ success: true, film });
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

// routes/selection-close-vote.ts
router.put("/selection/:id/close-vote", async (req, res) => {
  const selectionId = req.params.id;

  try {
    // Récupère tous les films liés à cette sélection
    const filmSelections = await prisma.filmSelection.findMany({
      where: { selectionId },
      include: {
        film: {
          include: {
            interests: true,
            votes: true,
          },
        },
      },
    });

    // Calcul des scores (ici simple : moyenne des notes + poids des intérêts)
    const updates = filmSelections.map(async (fs) => {
      const votes = fs.film.votes ?? [];
      const interests = fs.film.interests ?? [];

      const voteScore = votes.length
        ? votes.reduce((acc, v) => acc + (v.score ?? 0), 0) / votes.length
        : 0;
      const interestScore = interests.length / 5; // pondération arbitraire

      const score = Math.min(10, voteScore + interestScore);

      return prisma.filmSelection.update({
        where: { id: fs.id },
        data: {
          score,
          selected: score > 5,
        },
      });
    });

    await Promise.all(updates);

    // Marque la sélection comme clôturée
    await prisma.selection.update({
      where: { id: selectionId },
      data: {
        voteClosed: true,
        status: "programmation",
      },
    });

    res.status(200).json({ message: "Votes clôturés et scores calculés." });
  } catch (error) {
    console.error("❌ Erreur clôture vote :", error);
    res.status(500).json({ error: "Erreur lors de la clôture du vote." });
  }
});

// Exemple Express
router.post("/:id/approve", async (req, res) => {
  const selectionId = parseInt(req.params.id, 10);
  const { films, nbVotants } = req.body || {};

  if (!selectionId || !Array.isArray(films) || films.length === 0) {
    return res.status(400).json({ error: "selectionId ou films invalides." });
  }

  // ---- pondérations des intérêts (aligne avec ton front)
  const WEIGHTS = {
    SANS_OPINION: 0,
    NOT_INTERESTED: -1,
    CURIOUS: 1,
    VERY_INTERESTED: 2,
    MUST_SEE: 3,
  };
  const KEYS = Object.keys(WEIGHTS);

  const interestScoreFromCounts = (counts = {}) =>
    KEYS.reduce((acc, k) => acc + (counts[k] || 0) * WEIGHTS[k], 0);

  try {
    const filmIds = films.map((f) => f.id);

    // 1) Récupérer les intérêts groupés pour tous les films d’un coup
    const grouped = await prisma.interest.groupBy({
      by: ["film_id", "value"], // ou ["filmId","value"] selon ton schéma
      where: { film_id: { in: filmIds } }, // idem
      _count: { _all: true },
    });

    // Regrouper par filmId → { [filmId]: { value: count } }
    const countsByFilm = {};
    for (const g of grouped) {
      const fid = g.film_id ?? g.filmId;
      (countsByFilm[fid] ||= {})[g.value] = g._count._all;
    }

    // 2) Construire finalScore par film (vote fourni par le front)
    const finalScoreByFilm = {};
    for (const { id: filmId, votes } of films) {
      const safeVotes = Math.max(0, Number(votes) || 0);

      // Contrôle optionnel : votes <= nbVotants s’il est fourni
      if (nbVotants != null && safeVotes > Number(nbVotants)) {
        return res.status(400).json({
          error: `Le film ${filmId} a ${safeVotes} voix > nbVotants=${nbVotants}`,
        });
      }

      const interestCounts = countsByFilm[filmId] || {};
      const interestScore = interestScoreFromCounts(interestCounts);
      const finalScore = safeVotes * 2 + interestScore;

      finalScoreByFilm[filmId] = {
        finalScore,
        interestScore,
        votes: safeVotes,
      };
    }

    // 3) Transaction : passer la sélection en "programmation" + MAJ pivot
    await prisma.$transaction(async (tx) => {
      await tx.selection.update({
        where: { id: selectionId },
        data: { status: "programmation" },
      });

      for (const filmId of filmIds) {
        const s = finalScoreByFilm[filmId]?.finalScore ?? 0;
        await tx.selectionFilm.update({
          where: { filmId_selectionId: { filmId, selectionId } }, // nécessite @@unique([filmId, selectionId]) ✅
          data: {
            selected: true,
            score: s,
          },
        });
      }
    });

    res.status(200).json({ success: true, scores: finalScoreByFilm });
  } catch (err) {
    console.error("POST /:id/approve error:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/selections/:id/programming
// body: { items: [{ filmId, cinemas: [2,5], perCinema: { "2": { suggested, capLabel, notes, cycleId? }, "5": {...} } }] }
router.post("/:id/programming", async (req, res) => {
  const selectionId = parseInt(req.params.id, 10);
  const { items } = req.body || {};

  if (!selectionId || !Array.isArray(items)) {
    return res.status(400).json({ error: "Payload invalide" });
  }

  // validation rapide
  for (const it of items) {
    if (!it?.filmId || !Array.isArray(it?.cinemas)) {
      return res.status(400).json({ error: "item invalide" });
    }
    for (const cid of it.cinemas) {
      const cfg = it.perCinema?.[cid];
      if (!cfg) continue;
      const s = Number(cfg.suggested ?? 0);
      if (Number.isNaN(s) || s < 0 || s > 9) {
        return res.status(400).json({
          error: `suggested hors bornes (0..9) pour film ${it.filmId} / cinema ${cid}`,
        });
      }
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const it of items) {
        for (const cid of it.cinemas) {
          const cfg = it.perCinema?.[cid] || {};
          await tx.selectionFilmProgramming.upsert({
            where: {
              selectionId_filmId_cinemaId: {
                selectionId,
                filmId: it.filmId,
                cinemaId: Number(cid),
              },
            },
            create: {
              selectionId,
              filmId: it.filmId,
              cinemaId: Number(cid),
              suggested: Number(cfg.suggested ?? 0),
              capLabel: cfg.capLabel ?? null,
              notes: cfg.notes ?? null,
              cycleId: cfg.cycleId ?? null,
            },
            update: {
              suggested: Number(cfg.suggested ?? 0),
              capLabel: cfg.capLabel ?? null,
              notes: cfg.notes ?? null,
              cycleId: cfg.cycleId ?? null,
            },
          });
        }
      }
    });

    res.json({ success: true });
  } catch (e) {
    console.error("POST /:id/programming error", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// POST /api/selections/:id/programming/:filmId/comments
// body: { cinemaId?: number, commentaire: string }
router.post(
  "/:id/programming/:filmId/comments",
  requireSession,
  async (req, res) => {
    const selectionId = parseInt(req.params.id, 10);
    const filmId = parseInt(req.params.filmId, 10);
    console.log(">>> filmId", filmId);
    const { cinemaId, commentaire } = req.body || {};
    const user_id = req.user?.id || req.auth?.userId;
    console.log(">>> user_id", user_id);
    if (!selectionId || !filmId || !commentaire?.trim()) {
      return res.status(400).json({ error: "Paramètres invalides" });
    }

    try {
      const created = await prisma.programmingComment.create({
        data: {
          selectionId,
          filmId,
          cinemaId: cinemaId ?? null,
          user_id,
          commentaire: commentaire.trim(),
        },
      });
      res.json(created);
    } catch (e) {
      console.error("POST programming comment error", e);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

export default router;
