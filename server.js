import * as dotenv from "dotenv";

import { fileURLToPath } from "url";
import path from "path";

// Résoudre le chemin du fichier .env approprié
const environment = process.env.NODE_ENV || "development";
const envFile = environment === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
console.log("🔍 DATABASE_URL =", process.env.DATABASE_URL);
console.log("📦 SUPABASE_URL =", process.env.SUPABASE_URL);

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma.js";
import importTmdbRoutes from "./routes/import_tmdb.js";
import filmsRoutes from "./routes/films.js";
import tagsRoutes from "./routes/tags.js";
import activityRoutes from "./routes/activity.js";
import selectionsRoutes from "./routes/selections.js";
import programmationRoutes from "./routes/programmation.js";
import systemRoutes from "./routes/system.js";
import interestRoutes from "./routes/interests.js";
import createUserRouter from "./routes/createUser.js";
import usersRouter from "./routes/users.js";
import votesRouter from "./routes/votes.js";
import profileRouter from "./routes/profile.js";
import authRoutes from "./routes/auth.js";

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🔍 PORT =", PORT);

const allowedOrigins = [
  "https://cineplages.vercel.app",
  "http://localhost:3000", // pour Nuxt en local
  "http://localhost:3001", // si tu lances Nuxt sur ce port
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // Autorise curl, SSR, etc.
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      console.warn("❌ Origin non autorisée :", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/api/test", (req, res) => {
  res.send("Test OK");
});

// Routes
app.use("/api", importTmdbRoutes);
app.use("/api/films", filmsRoutes);
app.use("/api/tags", tagsRoutes);
app.use("/api/selections", selectionsRoutes);
app.use("/api/programmation", programmationRoutes);
app.use("/api", systemRoutes);
app.use("/api/interests", interestRoutes);
app.use("/api/createUser", createUserRouter); // POST
app.use("/api/users", usersRouter);
app.use("/api/votes", votesRouter);
app.use("/api/profile", profileRouter);
app.use("/api/activity", activityRoutes);
app.use("/api/auth", authRoutes);

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

      app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error("❌ Échec de la connexion à la base :", err);
      process.exit(1);
    });
}

startServer();
