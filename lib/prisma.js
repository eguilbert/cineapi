import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["query", "info", "warn", "error"],
  });

prisma.$use(async (params, next) => {
  if (params.model === "User" && params.action === "create") {
    console.log("🔎 Prisma middleware intercepted User.create:");
    console.dir(params.args, { depth: null });
  }
  return next(params);
});
console.log("📡 Prisma DB URL:", process.env.DATABASE_URL);

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
