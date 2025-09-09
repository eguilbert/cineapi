import { prisma } from "../lib/prisma.js";
import axios from "axios";

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function updateUpcomingFilms() {
  console.log("→ Fetching TMDB upcoming films...");

  // Dates des 3 prochains mois
  const now = new Date();
  const in3Months = new Date();
  in3Months.setMonth(now.getMonth() + 3);
  console.log("DEPUIS...", now);
  console.log("...JUSQU'A ", in3Months);

  // Convert to YYYY-MM-DD
  const startDate = now.toISOString().split("T")[0];
  const endDate = in3Months.toISOString().split("T")[0];

  // Récupérer les films français à venir (paginer si nécessaire)
  const { data: discovery } = await axios.get(
    `${TMDB_BASE_URL}/discover/movie`,
    {
      params: {
        api_key: TMDB_API_KEY,
        language: "fr-FR",
        region: "FR",
        sort_by: "release_date.asc",
        include_adult: false,
        include_video: false,
        page: 1,
        with_release_type: 3, // sortie cinéma
        "release_date.gte": startDate,
        "release_date.lte": endDate,
      },
    }
  );

  const films = discovery.results || [];

  for (const film of films) {
    const tmdbId = film.id;

    // Récupérer les détails complets
    const { data } = await axios.get(`${TMDB_BASE_URL}/movie/${tmdbId}`, {
      params: {
        api_key: TMDB_API_KEY,
        language: "fr-FR",
        append_to_response: "videos",
      },
    });

    const title = data.title?.trim() || data.original_title;
    /* const releaseDate = data.release_date ? new Date(data.release_date) : null; */
    const releases = await axios.get(
      `https://api.themoviedb.org/3/movie/${film.id}/release_dates`,
      {
        params: { api_key: TMDB_KEY },
      }
    );

    const frReleases = releases.data.results.find((r) => r.iso_3166_1 === "FR");

    const validRelease = frReleases?.release_dates.find((rd) => {
      const date = new Date(rd.release_date);
      return (
        (rd.type === 2 || rd.type === 3) &&
        date >= new Date(startDate) &&
        date <= new Date(endDate)
      );
    });
    if (!validRelease) {
      console.log(`⛔ Pas de sortie FR valable pour "${detail.data.title}"`);
      continue;
    }

    const safeDate = (d) => {
      if (!d) return null;
      const dateObj = new Date(d);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    };
    const releaseDate = new Date(validRelease.release_date);

    const posterUrl = data.poster_path
      ? `https://image.tmdb.org/t/p/w500${data.poster_path}`
      : null;

    const trailer = data.videos?.results?.find(
      (v) => v.site === "YouTube" && v.type === "Trailer"
    );

    const trailerUrl = trailer
      ? `https://www.youtube.com/watch?v=${trailer.key}`
      : null;

    const existing = await prisma.film.findUnique({
      where: { tmdbId },
    });

    if (existing) {
      // Mise à jour si le film existe
      await prisma.film.update({
        where: { tmdbId },
        data: {
          title,
          releaseDate,
          posterUrl,
          trailerUrl,
        },
      });
      console.log(`🔄 Film mis à jour : ${title}`);
    } else {
      // Création sinon
      await prisma.film.create({
        data: {
          tmdbId,
          title,
          releaseDate,
          posterUrl,
          trailerUrl,
          origin: data.original_language?.toUpperCase() || "FR",
          genre: data.genres?.map((g) => g.name).join(", "),
          synopsis: data.overview,
          duration: data.runtime || null,
        },
      });
      console.log(`➕ Film ajouté : ${title}`);
    }
  }

  console.log(`✅ Import terminé : ${films.length} films traités.`);
}

/* import cron from "node-cron";
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
 */
