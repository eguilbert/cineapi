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

// GET /api/selections => lister toutes les sélections
router.get("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const selections = readSelections();

  const index = selections.findIndex((s) => String(s.id) === String(id));

  if (index === -1) {
    return res.status(404).json({ error: "Sélection non trouvée" });
  }
  const selection = selections.filter((selection) => selection.id === id);
  res.json(selection);
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

// Sauvegarde mise à jour d'une sélection
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const updated = req.body;

  fs.readFile(dbPath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Erreur lecture fichier" });

    let selections = [];
    try {
      selections = JSON.parse(data);
    } catch (e) {
      return res.status(500).json({ error: "Erreur parsing JSON" });
    }
    const index = selections.findIndex((s) => String(s.id) === String(id));
    if (index === -1) {
      return res.status(404).json({ error: "Sélection non trouvée" });
    }

    selections[index] = { ...selections[index], ...updated };

    fs.writeFile(dbPath, JSON.stringify(selections, null, 2), (err) => {
      if (err)
        return res.status(500).json({ error: "Erreur écriture fichier" });
      res.json({ success: true });
    });
  });
});

module.exports = router;
