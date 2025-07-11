import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

router.get("/health", async (req, res) => {
  try {
    await prisma.$executeRawUnsafe("SELECT 1");
    res.status(200).json({ status: "ok", db: true });
  } catch (err) {
    res.status(500).json({ status: "error", db: false, error: err.message });
  }
});

export default router;
