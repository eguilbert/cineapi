import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { updateScoresForFilm } from "../lib/updateScores.js";

const router = Router();

router.post("/votes", async (req, res) => {
  const { filmId, note, user_id, cinemaId, commentaire } = req.body;
  // ... create or update vote ...

  await updateScoresForFilm(filmId); // ✅ mise à jour automatique du score

  res.json({ success: true });
});

export default router;
