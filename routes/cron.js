import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/cron
 */
router.get("/update-upcoming", async (req, res) => {
  /* await updateUpcomingFilms(); */
  console.log("Route cron appelée !");
  res.json({ status: "OK" });
});

export default router;
