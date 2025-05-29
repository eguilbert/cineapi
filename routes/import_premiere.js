const express = require("express");
const axios = require("axios");
const router = express.Router();

// GET /api/import/premiere => films OMDb simulés depuis une liste de titres
router.get("/import/premiere", async (req, res) => {
  try {
    const weeklyTitles = [
      "Challengers",
      "Furiosa",
      "Le Deuxième acte",
      "Kung Fu Panda 4",
      "Les Explorateurs : l’aventure continue",
      "Moi, capitaine",
    ];

    const enriched = [];

    for (const title of weeklyTitles) {
      try {
        const r = await axios.get("https://www.omdbapi.com/", {
          params: {
            t: title,
            apikey: process.env.OMDB_API_KEY,
          },
        });
        const d = r.data;
        if (d && d.Title) {
          enriched.push({
            title: d.Title,
            director: d.Director || "",
            genre: d.Genre ? d.Genre.split(",")[0] : "",
            duration: d.Runtime ? parseInt(d.Runtime) : null,
            synopsis: d.Plot || "",
            category: "",
            poster_url: d.Poster || "",
          });
        }
      } catch (err) {
        console.warn("OMDb non trouvé pour", title);
      }
    }

    res.json(enriched);
  } catch (error) {
    console.error("Erreur import OMDb:", error);
    res.status(500).json({ error: "Erreur récupération OMDb" });
  }
});

module.exports = router;
