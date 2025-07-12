import express from "express";
import { PrismaClient } from "@prisma/client";
import { Router } from "express";
const router = Router();
const prisma = new PrismaClient();

// GET /api/tags
router.get("/", async (req, res) => {
  const validatedOnly = req.query.validated === "true";

  const tags = await prisma.filmTag.findMany({
    where: validatedOnly ? { validated: true } : {},
    orderBy: [{ category: "asc" }, { label: "asc" }],
  });

  res.json(tags);
});

// POST /api/tags
router.post("/", async (req, res) => {
  const { label, category, validated = false } = req.body;

  if (!label || !category)
    return res.status(400).json({ error: "Missing fields" });

  const tag = await prisma.filmTag.upsert({
    where: { label_category: { label, category } },
    update: { validated },
    create: { label, category, validated },
  });

  res.json(tag);
});

router.get("/search", async (req, res) => {
  const q = req.query.q?.toString() || "";
  if (!q || q.length < 2) return res.json([]);

  const tags = await prisma.filmTag.findMany({
    where: {
      label: {
        contains: q,
      },
    },
    take: 10,
    orderBy: { label: "asc" },
  });

  res.json(tags);
});

export default router;
