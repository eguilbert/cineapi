import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.post("/", async (req, res) => {
  const { userId, action, targetId, context } = req.body;

  if (!userId || !action) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    const log = await prisma.activityLog.create({
      data: { userId, action, targetId, context },
    });
    res.json(log);
  } catch (e) {
    console.error("Erreur log :", e);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

router.get("/", async (req, res) => {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: true },
  });
  res.json(logs);
});

export default router;
