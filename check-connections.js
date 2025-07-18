import { prisma } from "./lib/prisma.js";

const seuil = 8;

const result = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*) AS total, usename, client_addr
  FROM pg_stat_activity
  GROUP BY usename, client_addr
  ORDER BY total DESC;
`);

let alert = false;

for (const row of result) {
  if (row.usename === "postgres" && Number(row.total) >= seuil) {
    console.warn(
      `⚠️ Connexions Prisma élevées : ${row.total} actives (seuil : ${seuil})`
    );
    alert = true;
  }
}

if (!alert) {
  console.log("✅ Connexions Prisma sous contrôle.");
}

await prisma.$disconnect();
