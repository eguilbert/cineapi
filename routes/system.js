import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/health", async (req, res) => {
  try {
    console.log("Health check received"); // ajoute un log
    res.json({ status: "ok", timestamp: new Date().toISOString() });
    /*     await prisma.$executeRawUnsafe("SELECT 1");
    res.status(200).json({ status: "ok", db: true }); */
  } catch (err) {
    res.status(500).json({ status: "error", db: false, error: err.message });
  }
});

export default router;
