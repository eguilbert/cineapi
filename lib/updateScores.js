import { prisma } from "./prisma.js";

export async function updateScoresForFilm(filmId) {
  // 🔢 Récupérer toutes les sélections contenant ce film
  const selections = await prisma.selectionFilm.findMany({
    where: { filmId },
    select: { id: true, filmId: true, selectionId: true },
  });

  if (!selections.length) return;

  // 📊 Récupérer les stats d’intérêt
  const interestStatsRaw = await prisma.interest.groupBy({
    by: ["value"],
    where: { film_id: filmId },
    _count: true,
  });

  const interestStats = {};
  for (const stat of interestStatsRaw) {
    interestStats[stat.value] = stat._count;
  }

  const interestScore =
    (interestStats.MUST_SEE || 0) * 2 +
    (interestStats.CURIOUS || 0) * 1 +
    (interestStats.NOT_INTERESTED || 0) * -1;

  // 🧮 Calculer la moyenne des votes
  const votes = await prisma.vote.findMany({
    where: { filmId },
    select: { note: true },
  });
  const avgVote =
    votes.length > 0
      ? votes.reduce((acc, v) => acc + v.note, 0) / votes.length
      : 0;

  const score = Math.round(avgVote * 2 + interestScore);

  // 💾 Mettre à jour toutes les sélections contenant ce film
  await Promise.all(
    selections.map((sel) =>
      prisma.selectionFilm.update({
        where: { id: sel.id },
        data: { score },
      })
    )
  );
}
