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

export default router;
