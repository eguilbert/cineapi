import * as dotenv from "dotenv";
import path from "path";

// Charge le bon .env en fonction de l’environnement
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

console.log(
  "🧪 SUPABASE_URL (juste avant createClient):",
  process.env.SUPABASE_URL
);
console.log(
  "🧪 SUPABASE_ANON_KEY:",
  process.env.SUPABASE_ANON_KEY ? "présente" : "absente"
);

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js";

const router = Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

router.post("/", async (req, res) => {
  const { email, password, role = "INVITE", username, cinemaId } = req.body;

  if (!email || !password || !username || !cinemaId) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    // 1. Créer le compte utilisateur dans Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { username },
    });

    if (error) {
      console.error("Erreur Supabase:", error.message);
      return res.status(500).json({ error: "Échec création Supabase" });
    }

    const userId = data.user?.id;
    if (!userId) {
      return res
        .status(500)
        .json({ error: "Utilisateur Supabase non récupéré" });
    }

    // 2. Créer le profil associé dans UserProfile
    await prisma.userProfile.create({
      data: {
        user_id: userId,
        username,
        cinemaId: parseInt(cinemaId, 10),
        role,
      },
    });

    res.json({ message: "Utilisateur créé avec succès" });
  } catch (err) {
    console.error("Erreur création utilisateur :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
