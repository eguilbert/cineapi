import express from "express";
import { prisma } from "../lib/prisma.js";
import {
  normalizeInterestStats,
  getInterestCount,
  computeAverageInterest,
  computePopularityScore,
} from "../lib/score.js";
import { Router } from "express";
const router = Router();

// POST /api/programmation
router.post("/", async (req, res) => {
  const { jour, heure, salle, filmId } = req.body;

  const prog = await prisma.programmation.create({
    data: { jour, heure, salle, filmId },
  });

  res.json(prog);
});

// GET /api/programmation
router.get("/", async (req, res) => {
  const result = await prisma.programmation.findMany({
    include: { film: true },
  });
  res.json(result);
});

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
  const programming = await prisma.selectionFilmProgramming.findMany({
    where: { selectionId: selection.id },
    include: { cinema: true, cycle: true },
  });
  const progByFilm = programming.reduce((acc, p) => {
    (acc[p.filmId] ||= []).push({
      cinemaId: p.cinemaId,
      cinemaName: p.cinema?.name,
      suggested: p.suggested,
      capLabel: p.capLabel,
      notes: p.notes,
      cycle: p.cycle ? { id: p.cycle.id, name: p.cycle.name } : null,
    });
    return acc;
  }, {});
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
        storedScore: f.score ?? null, // ✅ score persistant (après approbation)

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

        programming: progByFilm[f.film.id] || [],
      };
    }),
  };

  res.json(result);
});

export default router;
