import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";
const DATABASE_URL =
  "postgresql://postgres:MmoKFPUZAlOMcIXqUzOapfSekyUntexR@interchange.proxy.rlwy.net:54197/railway";

const prisma = new PrismaClient();

const usersToCreate = [
  {
    email: "manu@jalons.com",
    username: "visiteur",
    password: "plages@2025",
  },
  /*   {
    email: "yolande.roger2@free.fr",
    username: "Yolande",
    password: "plages@2025",
  },
  {
    email: "pier.lemoigne@hotmail.com",
    username: "Pierrette",
    password: "plages@2025",
  },
  {
    email: "christian.chimirri@club-internet.fr",
    username: "Christian",
    password: "plages@2025",
  },
  {
    email: "marystho@gmail.com",
    username: "Maryse",
    password: "plages@2025",
  },
  {
    email: "mcgiacco@gmail.com",
    username: "Marie-Claude",
    password: "plages@2025",
  },
  {
    email: "s.faiderbe@yahoo.fr",
    username: "Sylvie",
    password: "plages@2025",
  },
  {
    email: "linelaine@free.fr",
    username: "Line",
    password: "plages@2025",
  },
  {
    email: "mcwikra@aol.com",
    username: "Marie-Christine",
    password: "plages@2025",
  },
  {
    email: "fleon.brehal@wanadoo.fr",
    username: "François",
    password: "plages@2025",
  }, */
];

const run = async () => {
  for (const u of usersToCreate) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });
    if (existing) {
      console.log(`⚠️ Utilisateur déjà existant : ${u.email} — ignoré`);
      continue;
    }

    const hashedPassword = await bcrypt.hash(u.password, 10);

    /*     const hashedPassword =
      "$2b$10$bMaQrsccdAxyavqB6Bq3D.nyk6GeKEDASMRPcyU2YENXoty6XMaNu"; */
    //plages@2025
    const userId = crypto.randomUUID();

    const user = await prisma.user.create({
      data: {
        id: userId,
        email: u.email,
        username: u.username,
        hashedPassword,
        role: "INVITE",
      },
    });

    console.log(`✅ Utilisateur créé : ${user.email} (${user.username})`);
  }
};

run()
  .catch((err) => {
    console.error("❌ Erreur :", err);
  })
  .finally(() => prisma.$disconnect());
