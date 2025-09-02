import * as dotenv from "dotenv";

import { fileURLToPath } from "url";
import path from "path";

// Shim crypto.getRandomValues pour Node.js
import { webcrypto } from "node:crypto";
if (!globalThis.crypto) {
  globalThis.crypto = webcrypto;
}

// Résoudre le chemin du fichier .env approprié
const environment = process.env.NODE_ENV || "development";
const envFile = environment === "production" ? ".env.production" : ".env.local";
dotenv.config({ path: path.resolve(process.cwd(), envFile) });
console.log("🔍 DATABASE_URL =", process.env.DATABASE_URL);

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
import cinemaRoutes from "./routes/cinemas.js";
import cronRoutes from "./routes/cron.js";
import statsRoutes from "./routes/stats.js";
/* import createUserRouter from "./routes/createUser.js"; */
/* import usersRouter from "./routes/users.js";
 */ import votesRouter from "./routes/votes.js";
/* import profileRouter from "./routes/profile.js";
 */ import authRoutes from "./routes/auth.js";
import projectionRoutes from "./routes/projections.js";

const app = express();

app.use((req, res, next) => {
  const _setHeader = res.setHeader.bind(res);
  res.setHeader = (name, value) => {
    if (typeof name === "string" && name.toLowerCase() === "set-cookie") {
      const arr = Array.isArray(value) ? value : [String(value)];
      const patched = arr.map((c) => {
        const hasNone = /;\s*SameSite=None/i.test(c);
        const hasPart = /;\s*Partitioned/i.test(c);
        return hasNone && !hasPart ? `${c}; Partitioned` : c;
      });
      return _setHeader(name, patched);
    }
    return _setHeader(name, value);
  };
  next();
});
app.set("trust proxy", 1);
const PORT = process.env.PORT || 3000;

console.log("🔍 PORT =", PORT);

const allowlist = [
  "https://cineplages.vercel.app",
  "http://localhost:3000", // pour Nuxt en local
  "http://127.0.0.1:3000",
  "http://localhost:3001", // si tu lances Nuxt sur ce port
];

const corsOptions = {
  origin(origin, cb) {
    // autoriser requêtes server-to-server / curl (pas d'en-tête Origin)
    if (!origin) return cb(null, true);
    const ok = allowlist.some((o) =>
      o instanceof RegExp ? o.test(origin) : o === origin
    );
    return ok ? cb(null, true) : cb(new Error("Origin non autorisée"));
  },
  credentials: true, // si tu envoies des cookies (sinon tu peux laisser à false)
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Content-Length"],
  optionsSuccessStatus: 204, // évite un body sur le préflight
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

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

app.use("/api/votes", votesRouter);
app.use("/api/activity", activityRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projections", projectionRoutes);
app.use("/api/cinemas", cinemaRoutes);
app.use("/api/cron", cronRoutes);
app.use("/api/stats", statsRoutes);

app.get("/", (req, res) => {
  res.send("Hello from CineAPI 🎬");
});
// (facultatif) s’assurer qu’on renvoie bien ce header
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    console.log("CORS preflight from:", req.headers.origin);
  }
  next();
});
app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);
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
