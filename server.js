require("dotenv").config(); // important si tu utilises .env
const express = require("express");
const cors = require("cors");
const importPremiere = require("./routes/import_premiere"); // chemin correct !
const importTmdb = require("./routes/import_tmdb");
const selectionsRouter = require("./routes/selections");

const db = require("./db"); // chemin vers db.js

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", importTmdb);

// 🚨 ici on monte bien le routeur
app.use("/api", importPremiere);

app.use("/api/selections", selectionsRouter);

app.get("/api/films", (req, res) => {
  const rows = db.prepare("SELECT * FROM films").all();
  res.json(rows);
});

app.post("/api/films", (req, res) => {
  const { title, director, genre, duration, category } = req.body;

  const stmt = db.prepare(`
    INSERT INTO films (title, director, genre, duration, category)
    VALUES (?, ?, ?, ?, ?)
  `);

  try {
    stmt.run(title, director, genre, duration, category);
    res.status(201).json({ success: true });
  } catch (e) {
    console.error("Erreur insertion film :", e);
    res.status(500).json({ error: "Insertion échouée" });
  }
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
