-- CreateTable
CREATE TABLE "FilmTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FilmFilmTag" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filmId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,
    CONSTRAINT "FilmFilmTag_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmFilmTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FilmTag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "FilmFilmTag_filmId_tagId_key" ON "FilmFilmTag"("filmId", "tagId");
