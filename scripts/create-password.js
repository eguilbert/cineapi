import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const setPassword = async (email, plain) => {
  const hashed = await bcrypt.hash(plain, 10);
  await prisma.user.update({
    where: { email },
    data: { hashedPassword: hashed, updatedAt: new Date() },
  });
  console.log("OK:", email);
};

await setPassword("eguilbert@jalons.com", "miette");
process.exit(0);
