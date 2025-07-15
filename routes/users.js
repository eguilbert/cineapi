import { Router } from "express";
import { prisma } from "../lib/prisma.js";
//import { PrismaClient } from "@prisma/client";

const router = Router();
//const prisma = new PrismaClient();

router.get("/", async (req, res) => {
  try {
    const users = await prisma.userProfile.findMany({
      select: {
        user_id: true,
        username: true,
        role: true,
        cinemaId: true,
        cinema: {
          select: { name: true },
        },
      },
      orderBy: {
        username: "asc",
      },
    });

    res.json(users);
  } catch (err) {
    console.error("Erreur chargement utilisateurs :", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// DELETE /api/users/:id
router.delete("/:id", async (req, res) => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({ error: "user_id manquant" });
  }

  try {
    // 1. Supprimer le profil public.userProfile
    await prisma.userProfile.delete({
      where: { user_id: userId },
    });

    // 2. Supprimer le compte Supabase (auth.users)
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Erreur Supabase deleteUser:", error.message);
      return res.status(500).json({ error: "Erreur suppression Supabase" });
    }

    res.json({ message: "Utilisateur supprimé avec succès" });
  } catch (err) {
    console.error("Erreur suppression utilisateur:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;
