import express from "express";

export default function filmTagsLinkingRouter(prisma) {
  const router = express.Router();

  // GET /api/films/:id/tags
  router.get("/films/:id/tags", async (req, res) => {
    try {
      const filmId = Number(req.params.id);
      if (!Number.isFinite(filmId))
        return res.status(400).json({ error: "Invalid film id" });

      const links = await prisma.filmFilmTag.findMany({
        where: { filmId },
        select: {
          tag: {
            select: { id: true, label: true, category: true, validated: true },
          },
        },
        orderBy: [{ tag: { category: "asc" } }, { tag: { label: "asc" } }],
      });

      res.json(links.map((l) => l.tag));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load film tags" });
    }
  });

  // POST /api/films/:id/tags  body: { tagIds: number[] }
  router.post("/films/:id/tags", async (req, res) => {
    try {
      const filmId = Number(req.params.id);
      const tagIds = Array.isArray(req.body?.tagIds) ? req.body.tagIds : [];

      if (!Number.isFinite(filmId))
        return res.status(400).json({ error: "Invalid film id" });

      const cleanIds = [
        ...new Set(tagIds.map(Number).filter((n) => Number.isFinite(n))),
      ];
      if (cleanIds.length === 0)
        return res.status(400).json({ error: "tagIds is required" });

      // createMany + skipDuplicates = parfait avec @@unique([filmId, tagId])
      await prisma.filmFilmTag.createMany({
        data: cleanIds.map((tagId) => ({ filmId, tagId })),
        skipDuplicates: true,
      });

      // Renvoie la liste à jour (pratique côté UI)
      const links = await prisma.filmFilmTag.findMany({
        where: { filmId },
        select: {
          tag: {
            select: { id: true, label: true, category: true, validated: true },
          },
        },
        orderBy: [{ tag: { category: "asc" } }, { tag: { label: "asc" } }],
      });

      res.json(links.map((l) => l.tag));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to add tags" });
    }
  });

  // DELETE /api/films/:id/tags/:tagId
  router.delete("/films/:id/tags/:tagId", async (req, res) => {
    try {
      const filmId = Number(req.params.id);
      const tagId = Number(req.params.tagId);
      if (!Number.isFinite(filmId) || !Number.isFinite(tagId)) {
        return res.status(400).json({ error: "Invalid ids" });
      }

      await prisma.filmFilmTag.deleteMany({
        where: { filmId, tagId },
      });

      res.json({ ok: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to remove tag" });
    }
  });

  return router;
}
