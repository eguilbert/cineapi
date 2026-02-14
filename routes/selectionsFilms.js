import express from "express";

export default function selectionsFilmsRouter(prisma) {
  const router = express.Router();

  // GET /api/selections/:id/films?includeTags=1
  router.get("/selections/:id/films?includeTags=1", async (req, res) => {
    try {
      const selectionId = Number(req.params.id);
      const includeTags = (req.query.includeTags || "") === "1";
      if (!Number.isFinite(selectionId))
        return res.status(400).json({ error: "Invalid selection id" });

      const rows = await prisma.selectionFilm.findMany({
        where: { selectionId },
        select: {
          id: true,
          score: true,
          selected: true,
          category: true,
          film: {
            select: {
              id: true,
              title: true,
              posterUrl: true,
              category: true,
              releaseDate: true,
              filmTags: includeTags
                ? {
                    select: {
                      tag: {
                        select: {
                          id: true,
                          label: true,
                          category: true,
                          validated: true,
                        },
                      },
                    },
                    orderBy: [
                      { tag: { category: "asc" } },
                      { tag: { label: "asc" } },
                    ],
                  }
                : false,
            },
          },
        },
        orderBy: [{ score: "desc" }, { id: "asc" }],
      });

      const films = rows.map((r) => ({
        selectionFilmId: r.id,
        score: r.score,
        selected: r.selected,
        selectionCategory: r.category,
        ...r.film,
        tags: includeTags
          ? (r.film.filmTags || []).map((x) => x.tag)
          : undefined,
      }));

      res.json(films);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load selection films" });
    }
  });

  return router;
}
