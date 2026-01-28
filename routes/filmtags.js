import express from "express";

export default function filmTagsRouter(prisma) {
  const router = express.Router();

  // GET /api/filmtags/categories
  router.get("/categories", async (_req, res) => {
    try {
      const rows = await prisma.filmTag.findMany({
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      });
      res.json(rows.map((r) => r.category).filter(Boolean));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load categories" });
    }
  });

  // GET /api/filmtags?category=...&search=...
  router.get("/", async (req, res) => {
    try {
      const category = (req.query.category || "").toString().trim();
      const search = (req.query.search || "").toString().trim();

      const where = {
        ...(category ? { category } : {}),
        ...(search ? { label: { contains: search, mode: "insensitive" } } : {}),
      };

      const tags = await prisma.filmTag.findMany({
        where,
        select: { id: true, label: true, category: true, validated: true },
        orderBy: [{ validated: "desc" }, { label: "asc" }],
        take: 200,
      });

      res.json(tags);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to load tags" });
    }
  });

  // POST /api/filmtags  body: { label, category }
  router.post("/", async (req, res) => {
    try {
      const label = (req.body?.label || "").toString().trim();
      const category = (req.body?.category || "").toString().trim();

      if (!label) return res.status(400).json({ error: "label is required" });
      if (!category)
        return res.status(400).json({ error: "category is required" });

      // IMPORTANT: label est @unique globalement dans ton schéma
      // -> si déjà existant, on le renvoie au lieu d'échouer
      const existing = await prisma.filmTag.findUnique({
        where: { label },
        select: { id: true, label: true, category: true, validated: true },
      });
      if (existing) {
        return res.status(200).json({
          ...existing,
          alreadyExisted: true,
        });
      }

      const created = await prisma.filmTag.create({
        data: {
          label,
          category,
          validated: false,
        },
        select: { id: true, label: true, category: true, validated: true },
      });

      res.status(201).json(created);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create tag" });
    }
  });

  return router;
}
