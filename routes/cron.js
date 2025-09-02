import { Router } from "express";
import "../cron/updateUpcomingFilms.js";

import { prisma } from "../lib/prisma.js";

const router = Router();

/**
 * GET /api/cron
 */
router.get("/update-upcoming", async (req, res) => {
  try {
    console.log("CRON: Début updateUpcomingFilms");
    await updateUpcomingFilms();
    console.log("CRON: Fin updateUpcomingFilms");
    res.json({ status: "OK" });
  } catch (err) {
    console.error("CRON ERROR:", err);
    res.status(500).json({ error: "Échec de mise à jour des films" });
  }
});

export default router;
