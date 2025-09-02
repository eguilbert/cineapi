import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

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
router.post("/", async (req, res) => {
  try {
    const { date, hour, ...rest } = req.body;

    const fullDateTime = new Date(`${date}T${hour}:00`);

    const projection = await prisma.filmProjection.create({
      data: {
        ...rest,
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
router.put("/:id", async (req, res) => {
  try {
    const projection = await prisma.filmProjection.update({
      where: { id: Number(req.params.id) },
      data: req.body,
    });
    res.json(projection);
  } catch (error) {
    console.error("PUT /projections/:id", error);
    res.status(500).json({ error: "Erreur lors de la mise à jour" });
  }
});

// Supprimer une projection
router.delete("/:id", async (req, res) => {
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
      select: { id: true, title: true, releaseDate: true, posterUrl: true },
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
