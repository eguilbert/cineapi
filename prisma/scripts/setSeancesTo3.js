import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.film.updateMany({
    data: { seances: 3 },
  });
  console.log(`${result.count} films mis à jour avec seances = 3`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
