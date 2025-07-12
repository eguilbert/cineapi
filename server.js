import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import importTmdbRoutes from "./routes/import_tmdb.js";
import filmsRoutes from "./routes/films.js";
import tagsRoutes from "./routes/tags.js";
import selectionsRoutes from "./routes/selections.js";
import programmationRoutes from "./routes/programmation.js";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api", importTmdbRoutes);
app.use("/api/films", filmsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/selections", selectionsRoutes);
app.use("/api/programmation", programmationRoutes);

app.get("/", (req, res) => {
  res.send("Hello from CineAPI 🎬");
});
function testDbConnection() {
  return prisma.$executeRawUnsafe("SELECT 1");
}

function startServer() {
  testDbConnection()
    .then(() => {
      console.log("✅ Connexion à la base réussie");

      app.listen(PORT, () => {
        console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Échec de la connexion à la base :", err);
      process.exit(1);
    });
}

startServer();
