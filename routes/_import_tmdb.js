const express = require("express");
const axios = require("axios");
const router = express.Router();

const TMDB_KEY = process.env.TMDB_API_KEY;

// GET /api/import/tmdb => films sortis cette semaine en France enrichis
router.get("/import/tmdb", async (req, res) => {
  const { start, end } = req.query;

  const today = new Date();
  const oneWeekLater = new Date();
  oneWeekLater.setDate(today.getDate() + 6);

  const formatDate = (date) => date.toISOString().split("T")[0];

  const startDate = start || formatDate(today);
  const endDate = end || formatDate(oneWeekLater);

  let allResults = [];
  let page = 1;
  let totalPages = 1;

  try {
    do {
      const discoverUrl = `https://api.themoviedb.org/3/discover/movie`;

      const discoverRes = await axios.get(discoverUrl, {
        params: {
          api_key: TMDB_KEY,
          region: "FR",
          sort_by: "release_date.desc",
          "release_date.gte": startDate,
          "release_date.lte": endDate,
          with_release_type: 2 | 3, // theatrical
          language: "fr-FR",
          include_video: false,
          include_adult: false,
          page,
        },
      });

      const results = discoverRes.data.results;
      totalPages = discoverRes.data.total_pages;
      allResults.push(...results);

      page++;
    } while (page <= totalPages);

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

        const credits = await axios.get(
          `https://api.themoviedb.org/3/movie/${film.id}/credits`,
          {
            params: {
              api_key: TMDB_KEY,
            },
          }
        );

        const director = credits.data.crew.find((p) => p.job === "Director");
        const cast = credits.data.cast
          ?.slice(0, 4)
          .map((actor) => actor.name)
          .join(", ");

        films.push({
          title: detail.data.title,
          tmdb_id: film.id,
          director: director ? director.name : "",
          actors: cast,
          genre: detail.data.genres?.[0]?.name || "",
          duration: detail.data.runtime || null,
          synopsis: detail.data.overview || "",
          origin: detail.origin_country,
          category: "",
          budget: detail.data.budget,
          keywords: [],
          release_date: detail.data.release_date || "",
          production_countries:
            detail.data.production_countries?.map((c) => c.name) || [],

          poster_url: detail.data.poster_path
            ? `https://image.tmdb.org/t/p/w500${detail.data.poster_path}`
            : "",
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
