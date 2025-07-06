// routes/import_tmdb.js

const express = require("express");
const axios = require("axios");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const TMDB_KEY = process.env.TMDB_API_KEY;

// GET /api/import/tmdb => films sortis cette semaine en France enrichis et sauvegardés
router.get("/import/tmdb", async (req, res) => {
  const { start, end } = req.query;

  const today = new Date();
  const oneWeekLater = new Date();
  oneWeekLater.setDate(today.getDate() + 6);

  const formatDate = (date) => date.toISOString().split("T")[0];
  const startDate = start || formatDate(today);
  const endDate = end || formatDate(oneWeekLater);

  let page = 1;
  const allResults = [];

  function autocategorize(film) {
    const genre = film.genres.map((g) => g.name.toLowerCase());
    const budget = Number(film.budget || 0);
    const origin = String(film.origin || "");
    const keywords = Array.isArray(film.keywords)
      ? film.keywords.map((k) => k.toLowerCase())
      : [];
    const countries = (film.production_countries || []).map((c) =>
      c.toLowerCase()
    );

    if (
      genre.includes("animation") ||
      genre.includes("familial") ||
      keywords.includes("children") ||
      keywords.includes("enfant")
    )
      return "Jeunesse";

    if (
      genre.includes("drame") &&
      (countries.includes("france") ||
        countries.includes("belgium") ||
        countries.includes("japan")) &&
      !genre.includes("action") &&
      budget > 0 &&
      budget < 5000000
    )
      return "Art et Essai";

    if (
      genre.includes("comédie") ||
      genre.includes("action") ||
      genre.includes("aventure") ||
      genre.includes("fantasy") ||
      genre.includes("science-fiction") ||
      genre.includes("thriller") ||
      budget >= 5000000
    )
      return "Grand Public";

    // 🎭 Règles de catégorisation simples
    if (genre.includes("documentaire")) {
      return "Documentaire";
    }

    // 🎯 Valeur par défaut
    return "Art et Essai";
  }

  try {
    // Fetch paginated results from TMDB
    let totalPages = 1;
    do {
      const discoverUrl = `https://api.themoviedb.org/3/discover/movie`;
      const discoverRes = await axios.get(discoverUrl, {
        params: {
          api_key: TMDB_KEY,
          region: "FR",
          sort_by: "release_date.desc",
          "release_date.gte": startDate,
          "release_date.lte": endDate,
          with_release_type: 2 | 3,
          language: "fr-FR",
          include_video: false,
          include_adult: false,
          // "with_runtime.gte": 40,
          page,
        },
      });

      const results = discoverRes.data.results;
      totalPages = discoverRes.data.total_pages;

      allResults.push(...results);
      page++;
    } while (page <= totalPages && page <= 5); // limit to 5 pages for safety

    const films = [];

    for (const film of allResults) {
      try {
        const detail = await axios.get(
          `https://api.themoviedb.org/3/movie/${film.id}`,
          {
            params: {
              api_key: TMDB_KEY,
              language: "fr-FR",
            },
          }
        );

        // ⛔ Ignore les films trop courts
        if (detail.data.runtime && detail.data.runtime <= 45) {
          console.log(
            `⏩ Ignoré : "${detail.data.title}" (durée ${detail.data.runtime} min)`
          );
          continue;
        }

        const videos = await axios.get(
          `https://api.themoviedb.org/3/movie/${film.id}/videos`,
          { params: { api_key: TMDB_KEY } }
        );
        const trailer = videos.data.results
          .filter(
            (v) =>
              v.site === "YouTube" &&
              v.key &&
              (v.type === "Trailer" || v.type === "Teaser")
          )
          .sort(
            (a, b) => new Date(b.published_at) - new Date(a.published_at)
          )[0];

        console.log(
          "🎬 Vidéos TMDB:",
          JSON.stringify(videos.data.results, null, 2)
        );
        console.log("🎯 Trailer trouvé :", trailer);

        const trailerUrl = trailer
          ? `https://www.youtube.com/watch?v=${trailer.key}`
          : null;

        const releases = await axios.get(
          `https://api.themoviedb.org/3/movie/${film.id}/release_dates`,
          {
            params: { api_key: TMDB_KEY },
          }
        );

        const frReleases = releases.data.results.find(
          (r) => r.iso_3166_1 === "FR"
        );
        const validRelease = frReleases?.release_dates.find((rd) => {
          const date = new Date(rd.release_date);
          return (
            (rd.type === 2 || rd.type === 3) &&
            date >= new Date(startDate) &&
            date <= new Date(endDate)
          );
        });

        if (!validRelease) continue;

        const releaseDate = new Date(validRelease.release_date);

        // → tu peux ensuite l’utiliser dans ta sauvegarde

        const credits = await axios.get(
          `https://api.themoviedb.org/3/movie/${film.id}/credits`,
          {
            params: { api_key: TMDB_KEY },
          }
        );

        const directorName = credits.data.crew.find(
          (p) => p.job === "Director"
        )?.name;
        const cast = credits.data.cast
          ?.slice(0, 4)
          .map((actor) => actor.name)
          .join(", ");

        // Upsert director
        let director = null;
        if (directorName) {
          director = await prisma.director.upsert({
            where: { name: directorName },
            update: {},
            create: { name: directorName },
          });
        }

        // Upsert production countries
        const countries = detail.data.production_countries || [];
        const countryRecords = await Promise.all(
          countries.map((c) =>
            prisma.country.upsert({
              where: { name: c.name },
              update: {},
              create: { name: c.name },
            })
          )
        );

        const safeDate = (d) => {
          if (!d) return null;
          const dateObj = new Date(d);
          return isNaN(dateObj.getTime()) ? null : dateObj;
        };

        const category = autocategorize({
          title: detail.data.title,
          overview: detail.data.overview,
          runtime: detail.data.runtime,
          genres: detail.data.genres || [],
        });

        // Save film in DB
        const savedFilm = await prisma.film.upsert({
          where: { tmdbId: film.id },
          update: {
            category,
          },
          create: {
            tmdbId: film.id,
            title: detail.data.title,
            genre: detail.data.genres?.[0]?.name || "",
            category,
            synopsis: detail.data.overview,
            releaseDate: safeDate(releaseDate),
            // releaseDate: safeDate(detail.data.releaseDate),
            duration: detail.data.runtime,
            budget: detail.data.budget,
            origin: detail.data.origin_country?.[0] || "",
            posterUrl: detail.data.poster_path
              ? `https://image.tmdb.org/t/p/w500${detail.data.poster_path}`
              : "",
            actors: cast,
            trailerUrl: trailerUrl,
            director: director ? { connect: { id: director.id } } : undefined,
            productionCountries: {
              create: countryRecords.map((c) => ({
                country: { connect: { id: c.id } },
              })),
            },
          },
        });

        films.push({
          ...savedFilm,
          directorName, // ← on enrichit manuellement la réponse
        });
      } catch (e) {
        console.warn("Erreur enrichissement TMDb pour", film.title, e.message);
      }
    }

    res.json(films);
  } catch (error) {
    console.error("Erreur accès TMDb:", error.message);
    res.status(500).json({ error: "Erreur récupération TMDb" });
  }
});

module.exports = router;
