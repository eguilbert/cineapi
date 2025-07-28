import * as dotenv from "dotenv";
import path from "path";

// Charge le bon .env en fonction de l’environnement
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

/* console.log(
  "🧪 SUPABASE_URL (juste avant createClient):",
  process.env.SUPABASE_URL
);
console.log(
  "🧪 SUPABASE_ANON_KEY:",
  process.env.SUPABASE_ANON_KEY ? "présente" : "absente"
);
 */
import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.post("/", async (req, res) => {
  const { user_id, username } = req.body;

  try {
    const profile = await prisma.userProfile.upsert({
      where: { user_id },
      update: { username },
      create: {
        user_id,
        username,
        cinemaId: 3, // ou dynamique
        role: "INVITE",
      },
    });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ error: "Erreur création profil" });
  }
});

router.post("/api/profile/username-exists", async (req, res) => {
  const { username } = req.body;

  if (!username) return res.status(400).json({ error: "Username requis." });

  try {
    const exists = await prisma.userProfile.findUnique({
      where: { username },
    });

    res.json({ exists: !!exists });
  } catch (error) {
    console.error("Erreur vérif username:", error);
    res.status(500).json({ error: "Erreur serveur." });
  }
});

export default router;
