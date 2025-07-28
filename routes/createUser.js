import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "../lib/prisma.js"; // Assure-toi que prisma.js exporte correctement l'instance

import * as dotenv from "dotenv";
import path from "path";

// Charge le bon .env en fonction de l’environnement
const envFile =
  process.env.NODE_ENV === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });

const router = Router();

// Vérification des variables d'environnement
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("❌ SUPABASE_URL ou SERVICE_ROLE_KEY manquant dans .env !");
}
console.log("🧪 SUPABASE_URL (createUSER):", process.env.SUPABASE_URL);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/", async (req, res) => {
  const adminToken = req.get("x-admin-token");
  console.log("✅ Token attendu:", process.env.ADMIN_SECRET_TOKEN);
  console.log("🔐 Token reçu côté API:", adminToken); // ← 🧪 debug ici

  if (adminToken !== process.env.ADMIN_SECRET_TOKEN) {
    return res.status(401).json({ error: "Accès non autorisé" });
  }

  const { email, username, cinemaId, role } = req.body;

  if (!email || !username || !cinemaId) {
    return res.status(400).json({ error: "Champs requis manquants" });
  }

  try {
    // 1. Créer l'utilisateur Supabase
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      invite: true,
    });

    if (error) {
      console.error("❌ Erreur Supabase:", error);
      return res.status(500).json({ error: error.message });
    }

    const userId = data?.user?.id;
    if (!userId) {
      return res.status(500).json({ error: "ID utilisateur introuvable" });
    }

    // 2. Créer le profil associé
    await prisma.userProfile.create({
      data: {
        user_id: userId,
        username,
        cinemaId: parseInt(cinemaId, 10),
        role: role || "INVITE",
      },
    });

    return res.json({ message: "Utilisateur créé avec succès" });
  } catch (err) {
    console.error("❌ Erreur serveur :", err);
    return res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
