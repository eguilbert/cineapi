-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Film" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "category" TEXT,
    "synopsis" TEXT,
    "releaseDate" DATETIME,
    "duration" INTEGER,
    "budget" INTEGER,
    "origin" TEXT,
    "posterUrl" TEXT,
    "commentaire" TEXT,
    "rating" REAL,
    "actors" TEXT,
    "keywords" TEXT,
    "seances" INTEGER NOT NULL DEFAULT 1,
    "directorId" INTEGER,
    CONSTRAINT "Film_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Film" ("actors", "budget", "category", "commentaire", "directorId", "duration", "genre", "id", "keywords", "origin", "posterUrl", "rating", "releaseDate", "synopsis", "title", "tmdbId") SELECT "actors", "budget", "category", "commentaire", "directorId", "duration", "genre", "id", "keywords", "origin", "posterUrl", "rating", "releaseDate", "synopsis", "title", "tmdbId" FROM "Film";
DROP TABLE "Film";
ALTER TABLE "new_Film" RENAME TO "Film";
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
