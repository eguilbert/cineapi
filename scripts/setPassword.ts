// scripts/setPassword.ts (ou route admin)
import { prisma } from "@/lib/prisma";
import { Scrypt } from "oslo/password";

export async function setPasswordForUser(userId: string, plain: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.email) throw new Error("User not found or missing email");

  const keyId = `email:${user.email.toLowerCase()}`; // ← DOIT matcher ton login
  const hashed_password = await new Scrypt().hash(plain);

  await prisma.key.upsert({
    where: { id: keyId },
    create: {
      id: keyId,
      userId: user.id,
      hashed_password,
    },
    update: { hashed_password },
  });
}
