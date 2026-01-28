import express from "express";

export default function filmsSearchRouter(prisma) {
  const router = express.Router();

  // GET /api/films/search?q=...
  router.get("/films/search", async (req, res) => {
    try {
      const q = (req.query.q || "").toString().trim();
      if (!q) return res.json([]);

      const films = await prisma.film.findMany({
        where: { title: { contains: q, mode: "insensitive" } },
        select: { id: true, title: true, posterUrl: true },
        orderBy: { title: "asc" },
        take: 20,
      });

      res.json(films);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to search films" });
    }
  });

  return router;
}
