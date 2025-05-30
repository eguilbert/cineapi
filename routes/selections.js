const express = require("express");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const dbPath = path.join(__dirname, "../data/selections.json");

// Helper : lire les sélections existantes
function readSelections() {
  if (!fs.existsSync(dbPath)) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, "[]"); // initialise avec tableau vide
  }
  const raw = fs.readFileSync(dbPath);
  return JSON.parse(raw);
}

// Helper : sauvegarder les sélections
function saveSelections(data) {
  console.log("SAVE selection");
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// POST /api/selections => créer une nouvelle sélection
router.post("/", (req, res) => {
  const { name, films } = req.body;
  if (!name || !films || !Array.isArray(films)) {
    return res.status(400).json({ error: "Nom ou films manquants" });
  }

  const selections = readSelections();
  const newSelection = {
    id: Date.now(),
    name,
    date_created: new Date().toISOString(),
    films,
  };
  selections.push(newSelection);
  saveSelections(selections);

  res.json({ success: true, selection: newSelection });
});

// GET /api/selections => lister toutes les sélections
router.get("/", (req, res) => {
  const selections = readSelections();
  res.json(selections);
});

// DELETE /api/selections/:id => supprimer une sélection
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  let selections = readSelections();
  const index = selections.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ error: "Sélection non trouvée" });
  }

  selections.splice(index, 1);
  saveSelections(selections);

  res.json({ success: true });
});

module.exports = router;
