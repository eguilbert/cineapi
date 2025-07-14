import { Router } from "express";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

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

export default router;
