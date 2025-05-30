/*
  Warnings:

  - You are about to drop the column `comment` on the `Film` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Film` table. All the data in the column will be lost.
  - You are about to drop the column `director` on the `Film` table. All the data in the column will be lost.
  - You are about to drop the column `productionCountries` on the `Film` table. All the data in the column will be lost.
  - Made the column `releaseDate` on table `Film` required. This step will fail if there are existing NULL values in that column.
  - Made the column `tmdbId` on table `Film` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "Director" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Country" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "FilmCountry" (
    "filmId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    PRIMARY KEY ("filmId", "countryId"),
    CONSTRAINT "FilmCountry_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FilmCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
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
    "releaseDate" DATETIME NOT NULL,
    "duration" INTEGER,
    "budget" INTEGER,
    "origin" TEXT,
    "posterUrl" TEXT,
    "commentaire" TEXT,
    "rating" REAL,
    "actors" TEXT,
    "keywords" TEXT,
    "directorId" INTEGER,
    "selectionId" INTEGER,
    CONSTRAINT "Film_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Film_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Film" ("actors", "budget", "category", "duration", "genre", "id", "keywords", "origin", "posterUrl", "rating", "releaseDate", "selectionId", "synopsis", "title", "tmdbId") SELECT "actors", "budget", "category", "duration", "genre", "id", "keywords", "origin", "posterUrl", "rating", "releaseDate", "selectionId", "synopsis", "title", "tmdbId" FROM "Film";
DROP TABLE "Film";
ALTER TABLE "new_Film" RENAME TO "Film";
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Director_name_key" ON "Director"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");
