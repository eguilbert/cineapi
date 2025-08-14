import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const run = async () => {
  const user = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: "toto@debug.com",
      username: "debug",
      hashedPassword: "xxx",
      role: "INVITE",
    },
  });
  console.log("🧪 User created:", user);
};

run();
