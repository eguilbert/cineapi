-- CreateTable
CREATE TABLE "Film" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "category" TEXT,
    "synopsis" TEXT,
    "rating" REAL,
    "comment" TEXT,
    "director" TEXT,
    "actors" TEXT,
    "releaseDate" DATETIME,
    "duration" INTEGER,
    "budget" INTEGER,
    "origin" TEXT,
    "productionCountries" TEXT,
    "posterUrl" TEXT,
    "tmdbId" INTEGER,
    "keywords" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectionId" INTEGER,
    CONSTRAINT "Film_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Selection" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Programmation" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jour" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "salle" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Programmation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId");
