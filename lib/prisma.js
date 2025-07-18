import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient({
    log: ["error"],
  });
}

export const prisma = globalForPrisma.prisma;
