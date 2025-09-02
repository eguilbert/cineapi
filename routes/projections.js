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

export default router;
