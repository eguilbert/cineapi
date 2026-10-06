import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/cinemas
 * Optionnel: ?q=texte pour filtrer par nom (case-insensitive)
 */
router.get("/", async (req, res) => {
  try {
    const { q } = req.query;
    const where = q
      ? { name: { contains: String(q), mode: "insensitive" } }
      : {};

    const cinemas = await prisma.cinema.findMany({
      where,
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    res.json(cinemas);
  } catch (err) {
    console.error("GET /api/cinemas error:", err);
    res.status(500).json({ error: "Erreur lors du chargement des cinémas" });
  }
});

/**
 * GET /api/cinemas/:id/recommendations
 * Programmations proposées pour un cinéma.
 */
router.get("/:id/recommendations", async (req, res) => {
  const cinemaId = Number(req.params.id);
  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return res.status(400).json({ error: "Identifiant de cinéma invalide" });
  }

  try {
    const cinema = await prisma.cinema.findUnique({
      where: { id: cinemaId },
      select: { id: true },
    });
    if (!cinema) {
      return res.status(404).json({ error: "Cinéma introuvable" });
    }

    const recommendations = await prisma.selectionFilmProgramming.findMany({
      where: { cinemaId, suggested: { gt: 0 } },
      include: {
        film: {
          select: {
            id: true,
            tmdbId: true,
            title: true,
            category: true,
            posterUrl: true,
            releaseDate: true,
            director: { select: { name: true } },
          },
        },
        selection: {
          select: { id: true, name: true, date: true, status: true },
        },
        cycle: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: [
        { selectionId: "desc" },
        { suggested: "desc" },
        { filmId: "asc" },
      ],
    });

    return res.json(recommendations);
  } catch (err) {
    console.error(`GET /api/cinemas/${cinemaId}/recommendations error:`, err);
    return res
      .status(500)
      .json({ error: "Erreur lors du chargement des recommandations" });
  }
});

export default router;
