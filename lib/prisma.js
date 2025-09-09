import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [{ level: "query", emit: "event" }, "warn", "error"],
  });

prisma.$use(async (params, next) => {
  if (params.model === "User" && params.action === "create") {
    console.log("🔎 Prisma middleware intercepted User.create:");
    console.dir(params.args, { depth: null });
  }
  return next(params);
});
console.log("📡 Prisma DB URL:", process.env.DATABASE_URL);

prisma.$on("query", (e) => {
  // e.duration en ms — repère les > 500ms
  if (e.duration > 500)
    console.warn("Slow query:", e.query, e.params, e.duration);
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
