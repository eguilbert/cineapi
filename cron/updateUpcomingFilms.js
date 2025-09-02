import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { fetchTmdbDetails } from "../lib/tmdb.js";
import dayjs from "dayjs";

// ⏱ CRON: tous les jours à 2h du matin
cron.schedule("0 2 * * *", async () => {
  console.log("[CRON] 🔄 Mise à jour des films à venir...");
  await updateUpcomingFilms();
});

export async function updateUpcomingFilms() {
  const today = dayjs();
  const inThreeMonths = today.add(3, "months");
  console.log("→ Fetching TMDB upcoming...");

  // 1. Films dans les 3 prochains mois
  const films = await prisma.film.findMany({
    where: {
      releaseDate: {
        gte: today.toDate(),
        lte: inThreeMonths.toDate(),
      },
      select: {
        tmdbId: true,
      },
    },
  });

  console.log(`🎬 ${films.length} films à mettre à jour`);

  for (const film of films) {
    try {
      const data = await fetchTmdbDetails(film.tmdbId);

      const frenchTitle = data.title;
      const releaseDate = data.release_date;
      const poster = data.poster_path
        ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
        : null;

      const trailer = data.videos?.results?.find(
        (v) => v.site === "YouTube" && v.type === "Trailer"
      );
      const trailerUrl = trailer
        ? `https://www.youtube.com/watch?v=${trailer.key}`
        : null;

      await prisma.film.update({
        where: { id: film.id },
        data: {
          title: frenchTitle,
          releaseDate: releaseDate ? new Date(releaseDate) : null,
          poster: poster,
          trailer: trailerUrl,
        },
      });

      console.log(`✅ Film mis à jour: ${frenchTitle}`);
    } catch (err) {
      console.warn(
        `❌ Échec de la mise à jour pour le film ID ${film.id}:`,
        err.message
      );
    }
  }
}
