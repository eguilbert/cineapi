import { Router } from "express";
import { requireAuth } from "../middleware/jwt.js";
import { prisma } from "../lib/prisma.js";

const router = Router();

function canEditProjection(req, res, next) {
  const { role, cinemaId } = req.user;
  if (role === "ADMIN") return next();
  if (role === "PROGRAMMEUR" && cinemaId != null &&
      (req.body?.cinemaId === undefined || req.body.cinemaId === cinemaId)) return next();
  return res.status(403).json({ error: "Projection réservée à votre cinéma" });
}

function programmerProjectionData(body) {
  const { filmId, salle, audienceCount, commentaire } = body;
  return { filmId, salle, audienceCount, commentaire };
}

// Liste toutes les projections
router.get("/", async (req, res) => {
  const projections = await prisma.filmProjection.findMany({
    include: {
      film: true,
      cinema: true,
      selection: true,
      programming: true,
    },
    orderBy: { date: "asc" },
  });
  res.json(projections);
});

// Créer une projection
router.post("/", requireAuth, canEditProjection, async (req, res) => {
  try {
    const { date, hour, ...rest } = req.body;

    const fullDateTime = new Date(`${date}T${hour}:00`);

    const projection = await prisma.filmProjection.create({
      data: {
        ...(req.user.role === "ADMIN" ? rest : {
          ...programmerProjectionData(rest),
          cinemaId: req.user.cinemaId,
        }),
        date: fullDateTime,
        hour,
      },
    });
    res.status(201).json(projection);
  } catch (error) {
    console.error("POST /projections", error);
    res.status(500).json({ error: "Erreur lors de la création" });
  }
});

// Modifier une projection
router.put("/:id", requireAuth, canEditProjection, async (req, res) => {
  try {
    const { date, hour } = req.body;
    const programmer = req.user.role === "PROGRAMMEUR";
    const projection = await prisma.filmProjection.update({
      where: {
        id: Number(req.params.id),
        ...(programmer && { cinemaId: req.user.cinemaId }),
      },
      data: programmer ? {
        ...programmerProjectionData(req.body),
        hour,
        ...(date && hour && { date: new Date(`${date}T${hour}:00`) }),
      } : req.body,
    });
    res.json(projection);
  } catch (error) {
    if (error.code === "P2025") return res.status(404).json({ error: "Projection introuvable" });
    console.error("PUT /projections/:id", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// Supprimer une projection
router.delete("/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "ADMIN") {
    return res.status(403).json({ error: "Action réservée aux admins" });
  }
  try {
    await prisma.filmProjection.delete({
      where: { id: Number(req.params.id) },
    });
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /projections/:id", error);
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

router.get("/films/search", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "12", 10), 50);

    if (q.length < 2) return res.json([]); // évite de charger la DB pour rien

    const films = await prisma.film.findMany({
      where: { title: { contains: q, mode: "insensitive" } },
      /*       select: { id: true, title: true, releaseDate: true, posterUrl: true },
       */
      include: {
        director: true,
      },
      orderBy: [{ title: "asc" }],
      take: limit,
    });

    res.json(films);
  } catch (err) {
    console.error("GET /api/films/search error:", err);
    res.status(500).json({ error: "Erreur recherche films" });
  }
});

// routes/projections.js
router.get("/next", async (req, res) => {
  try {
    const now = new Date();
    const projections = await prisma.filmProjection.findMany({
      where: { date: { gte: now } },
      orderBy: [{ date: "asc" }, { hour: "asc" }],
      take: 5,
      include: {
        film: { select: { id: true, title: true } },
        cinema: { select: { id: true, name: true } },
      },
    });
    res.json(projections);
  } catch (err) {
    console.error("Erreur GET /api/projections/next:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
