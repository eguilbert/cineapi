import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/cron
 */
router.get("/cron/update-upcoming", async (req, res) => {
  await updateUpcomingFilms();
  res.json({ status: "OK" });
});

export default router;
