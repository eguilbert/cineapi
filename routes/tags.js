import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

// GET /api/tags/categories
router.get("/categories", async (_req, res) => {
  const rows = await prisma.filmTag.findMany({
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  res.json(rows.map((r) => r.category).filter(Boolean));
});

// GET /api/tags
router.get("/", async (req, res) => {
  const validatedOnly = req.query.validated === "true";

  const tags = await prisma.filmTag.findMany({
    where: validatedOnly ? { validated: true } : {},
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  res.json(tags);
});

// GET /api/tags/search?q=...
router.get("/search", async (req, res) => {
  const q = (req.query.q?.toString() || "").trim();
  if (!q || q.length < 2) return res.json([]);

  const tags = await prisma.filmTag.findMany({
    where: { label: { contains: q, mode: "insensitive" } },
    take: 20,
    orderBy: [{ label: "asc" }],
  });

  res.json(tags);
});

// POST /api/tags
router.post("/", async (req, res) => {
  const { label, category, validated = false } = req.body || {};
  const cleanLabel = (label || "").toString().trim();
  const cleanCategory = (category || "").toString().trim();

  if (!cleanLabel || !cleanCategory) {
    return res.status(400).json({ error: "Missing fields" });
  }

  // Ton schéma: FilmTag.label est @unique => upsert sur label
  const tag = await prisma.filmTag.upsert({
    where: { label: cleanLabel },
    update: { category: cleanCategory, validated: !!validated },
    create: {
      label: cleanLabel,
      category: cleanCategory,
      validated: !!validated,
    },
  });

  res.json(tag);
});

export default router;
