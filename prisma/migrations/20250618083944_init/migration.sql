-- CreateTable
CREATE TABLE "Film" (
    "id" SERIAL NOT NULL,
    "tmdbId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "category" TEXT,
    "synopsis" TEXT,
    "releaseDate" TIMESTAMP(3),
    "duration" INTEGER,
    "budget" INTEGER,
    "origin" TEXT,
    "posterUrl" TEXT,
    "commentaire" TEXT,
    "rating" DOUBLE PRECISION,
    "actors" TEXT,
    "keywords" TEXT,
    "seances" INTEGER NOT NULL DEFAULT 1,
    "directorId" INTEGER,

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Selection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionFilm" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "selectionId" INTEGER NOT NULL,
    "commentaire" TEXT,
    "note" INTEGER,
    "category" TEXT,

    CONSTRAINT "SelectionFilm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Director" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmCountry" (
    "filmId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "FilmCountry_pkey" PRIMARY KEY ("filmId","countryId")
);

-- CreateTable
CREATE TABLE "Programmation" (
    "id" SERIAL NOT NULL,
    "jour" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "salle" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Programmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmTag" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmFilmTag" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "FilmFilmTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Award" (
    "id" SERIAL NOT NULL,
    "prize" TEXT NOT NULL,
    "festival" TEXT NOT NULL,
    "year" INTEGER,
    "filmId" INTEGER NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionFilm_filmId_selectionId_key" ON "SelectionFilm"("filmId", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Director_name_key" ON "Director"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FilmTag_label_key" ON "FilmTag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "FilmFilmTag_filmId_tagId_key" ON "FilmFilmTag"("filmId", "tagId");

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionFilm" ADD CONSTRAINT "SelectionFilm_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionFilm" ADD CONSTRAINT "SelectionFilm_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmCountry" ADD CONSTRAINT "FilmCountry_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmCountry" ADD CONSTRAINT "FilmCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programmation" ADD CONSTRAINT "Programmation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmFilmTag" ADD CONSTRAINT "FilmFilmTag_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmFilmTag" ADD CONSTRAINT "FilmFilmTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FilmTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;
