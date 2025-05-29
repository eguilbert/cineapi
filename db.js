// db.js
const Database = require("better-sqlite3");
const db = new Database("films.db");

// Créer la table si elle n'existe pas
db.exec(`
CREATE TABLE IF NOT EXISTS films (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  director TEXT,
  genre TEXT,
  cast TEXT,
  duration INTEGER,
  year INTEGER,
  country TEXT,
  release_date TEXT,
  distributor TEXT,
  synopsis TEXT,
  rating_press REAL,
  rating_audience REAL,
  poster_url TEXT,
  category TEXT
);
`);

module.exports = db;
