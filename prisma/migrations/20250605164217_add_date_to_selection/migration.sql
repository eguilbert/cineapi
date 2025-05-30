/*
  Warnings:

  - You are about to drop the column `selectionId` on the `Film` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Selection` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "SelectionFilm" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filmId" INTEGER NOT NULL,
    "selectionId" INTEGER NOT NULL,
    "commentaire" TEXT,
    "note" INTEGER,
    "category" TEXT,
    CONSTRAINT "SelectionFilm_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SelectionFilm_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

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
    "directorId" INTEGER,
    CONSTRAINT "Film_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Film" ("actors", "budget", "category", "commentaire", "directorId", "duration", "genre", "id", "keywords", "origin", "posterUrl", "rating", "releaseDate", "synopsis", "title", "tmdbId") SELECT "actors", "budget", "category", "commentaire", "directorId", "duration", "genre", "id", "keywords", "origin", "posterUrl", "rating", "releaseDate", "synopsis", "title", "tmdbId" FROM "Film";
DROP TABLE "Film";
ALTER TABLE "new_Film" RENAME TO "Film";
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId");
CREATE TABLE "new_Selection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Selection" ("id", "name") SELECT "id", "name" FROM "Selection";
DROP TABLE "Selection";
ALTER TABLE "new_Selection" RENAME TO "Selection";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SelectionFilm_filmId_selectionId_key" ON "SelectionFilm"("filmId", "selectionId");
