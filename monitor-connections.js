import { prisma } from "./lib/prisma.js";

const result = await prisma.$queryRawUnsafe(`
  SELECT
    COUNT(*) AS total,
    usename,
    client_addr
  FROM
    pg_stat_activity
  GROUP BY
    usename, client_addr
  ORDER BY
    total DESC;
`);

console.table(result);
process.exit(0);
