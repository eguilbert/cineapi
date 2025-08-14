import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

const usersToCreate = [
  {
    email: "plages@jalons.com",
    username: "plage",
    password: "plages123",
  },
  /*   {
    email: "bob@example.com",
    username: "bobby",
    password: "pass456",
  },
  {
    email: "charlie@example.com",
    username: "charlie",
    password: "letmein789",
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
