import { Router } from "express";
import { prisma } from "../lib/prisma.js";
const router = Router();

// GET /api/lists?type=DYNAMIC&scope=GLOBAL
router.get("/", async (req, res) => {
  const { type, scope } = req.query;
  const where = {
    ...(type ? { type } : {}),
    ...(scope ? { scope } : {}),
    // si pas connecté: filtrer public
    // ...(req.user ? {} : { isPublic: true }),
  };
  const lists = await prisma.list.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      scope: true,
      coverUrl: true,
      description: true,
    },
  });
  res.json(lists);
});

// GET /api/lists/:slug
router.get("/:slug", async (req, res) => {
  const list = await prisma.list.findUnique({
    where: { slug: req.params.slug },
  });
  if (!list) return res.status(404).json({ error: "Liste introuvable" });
  res.json(list);
});

// Helper: calcule les items pour une liste selon son type/criteria
async function resolveListItems(list, { take = 20, skip = 0 }, userId = null) {
  const baseSelect = {
    id: true,
    title: true,
    posterUrl: true,
    releaseDate: true,
    category: true,
    synopsis: true,
  };

  // 1) CURATED/FAVORITES → via pivot ListFilm
  if (list.type === "CURATED" || list.type === "FAVORITES") {
    const rows = await prisma.listFilm.findMany({
      where: { listId: list.id },
      orderBy: [{ rank: "asc" }, { createdAt: "asc" }],
      skip,
      take,
      include: { film: { select: baseSelect } },
    });
    return rows.map((r) => r.film);
  }

  // 2) DYNAMIC / SYSTEM → via criteria JSON
  const c = list.criteria || {};
  // Ex1: sorties du mois (YYYY-MM)
  if (c.type === "RELEASES_MONTH") {
    const ym = c.month || new Date().toISOString().slice(0, 7); // "2025-09"
    const [year, month] = ym.split("-").map(Number);
    const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59));

    return prisma.film.findMany({
      where: { releaseDate: { gte: start, lte: end } },
      orderBy: [{ releaseDate: "asc" }, { title: "asc" }],
      skip,
      take,
      select: baseSelect,
    });
  }

  // Ex2 (optionnel): top “LOVE” publics
  if (c.type === "TOP_PUBLIC_LOVE") {
    const rows = await prisma.publicRating.groupBy({
      by: ["filmId"],
      where: { value: "LOVE" },
      _count: { _all: true },
      orderBy: { _count: { _all: "desc" } },
      take,
      skip,
    });
    const filmIds = rows.map((r) => r.filmId);
    return prisma.film.findMany({
      where: { id: { in: filmIds } },
      select: baseSelect,
    });
  }

  // fallback vide
  return [];
}

// GET /api/lists/:slug/items
router.get("/:slug/items", async (req, res) => {
  const list = await prisma.list.findUnique({
    where: { slug: req.params.slug },
  });
  if (!list) return res.status(404).json({ error: "Liste introuvable" });

  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const pageSize = Math.min(parseInt(req.query.pageSize || "20", 10), 100);
  const skip = (page - 1) * pageSize;
  const items = await resolveListItems(
    list,
    { skip, take: pageSize },
    req.user?.id || null
  );
  res.json({ page, pageSize, items });
});

// POST /api/lists (création)
router.post(
  "/",
  /* requireAdmin, */ async (req, res) => {
    const {
      name,
      slug,
      type,
      scope,
      description,
      coverUrl,
      isPublic,
      criteria,
      ownerId,
      cinemaId,
    } = req.body;
    const list = await prisma.list.create({
      data: {
        name,
        slug,
        type,
        scope,
        description,
        coverUrl,
        isPublic,
        criteria,
        ownerId,
        cinemaId,
      },
    });
    res.json(list);
  }
);

// POST /api/lists/:slug/add  (ajout d’un film à une CURATED/FAVORITES)
router.post(
  "/:slug/add",
  /* requireAdminOrOwner, */ async (req, res) => {
    const { filmId, rank, comment } = req.body;
    const list = await prisma.list.findUnique({
      where: { slug: req.params.slug },
    });
    if (!list) return res.status(404).json({ error: "Liste introuvable" });
    if (!(list.type === "CURATED" || list.type === "FAVORITES"))
      return res.status(400).json({
        error: "Seules les listes CURATED/FAVORITES acceptent l'ajout manuel",
      });

    await prisma.listFilm.upsert({
      where: { listId_filmId: { listId: list.id, filmId } },
      create: {
        listId: list.id,
        filmId,
        rank,
        comment,
        addedById: req.user?.id || null,
      },
      update: { rank, comment },
    });
    res.json({ ok: true });
  }
);

// POST /api/lists/:slug/remove
router.post(
  "/:slug/remove",
  /* requireAdminOrOwner, */ async (req, res) => {
    const { filmId } = req.body;
    const list = await prisma.list.findUnique({
      where: { slug: req.params.slug },
    });
    if (!list) return res.status(404).json({ error: "Liste introuvable" });

    await prisma.listFilm.deleteMany({ where: { listId: list.id, filmId } });
    res.json({ ok: true });
  }
);
router.post(
  "/:slug/bulk-add",
  /* requireAdminOrOwner, */ async (req, res) => {
    try {
      const { filmIds = [], append = true, startRank = null } = req.body;
      const list = await prisma.list.findUnique({
        where: { slug: req.params.slug },
      });
      if (!list) return res.status(404).json({ error: "Liste introuvable" });

      if (!(list.type === "CURATED" || list.type === "FAVORITES")) {
        return res
          .status(400)
          .json({ error: "Cette liste ne permet pas l'ajout manuel" });
      }

      let baseRank = startRank;
      if (append || baseRank == null) {
        const last = await prisma.listFilm.findFirst({
          where: { listId: list.id },
          orderBy: { rank: "desc" },
          select: { rank: true },
        });
        baseRank = (last?.rank ?? 0) + 10;
      }

      await prisma.$transaction(
        filmIds.map((filmId, i) =>
          prisma.listFilm.upsert({
            where: { listId_filmId: { listId: list.id, filmId } },
            create: { listId: list.id, filmId, rank: baseRank + i * 10 },
            update: { rank: baseRank + i * 10 },
          })
        )
      );

      res.json({ ok: true, added: filmIds.length });
    } catch (err) {
      console.error("POST /api/lists/:slug/bulk-add", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);

// POST /api/lists/:slug/reorder  (réordonnancer)
router.post(
  "/:slug/reorder",
  /* requireAdminOrOwner, */ async (req, res) => {
    try {
      const { items = [] } = req.body; // [{ filmId, rank }, ...]
      const list = await prisma.list.findUnique({
        where: { slug: req.params.slug },
      });
      if (!list) return res.status(404).json({ error: "Liste introuvable" });

      await prisma.$transaction(
        items.map((it) =>
          prisma.listFilm.update({
            where: { listId_filmId: { listId: list.id, filmId: it.filmId } },
            data: { rank: it.rank },
          })
        )
      );

      res.json({ ok: true });
    } catch (err) {
      console.error("POST /api/lists/:slug/reorder", err);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }
);
export default router;
