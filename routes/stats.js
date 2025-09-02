import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// routes/stats.js
router.get("/home", async (req, res) => {
  try {
    const [totalFilms, totalProjections, totalSpectateurs, totalCommentaires] =
      await Promise.all([
        prisma.film.count(),
        prisma.filmProjection.count(),
        prisma.filmProjection.aggregate({ _sum: { audienceCount: true } }),
        prisma.filmComment.count(),
      ]);

    res.json({
      totalFilms,
      totalProjections,
      totalSpectateurs: totalSpectateurs._sum.audienceCount || 0,
      totalCommentaires,
    });
  } catch (err) {
    console.error("Erreur GET /api/stats/home:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
