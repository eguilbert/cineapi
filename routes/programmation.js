import express from "express";
import { prisma } from "./lib/prisma.js";
//import { PrismaClient } from "@prisma/client";
import { Router } from "express";
const router = Router();
//const prisma = new PrismaClient();

// POST /api/programmation
router.post("/", async (req, res) => {
  const { jour, heure, salle, filmId } = req.body;

  const prog = await prisma.programmation.create({
    data: { jour, heure, salle, filmId },
  });

  res.json(prog);
});

// GET /api/programmation
router.get("/", async (req, res) => {
  const result = await prisma.programmation.findMany({
    include: { film: true },
  });
  res.json(result);
});

export default router;
