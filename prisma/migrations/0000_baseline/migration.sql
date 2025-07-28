-- CreateEnum
CREATE TYPE "InterestLevel" AS ENUM ('SANS_OPINION', 'NOT_INTERESTED', 'CURIOUS', 'MUST_SEE', 'VERY_INTERESTED');

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
CREATE TABLE "Cinema" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Cinema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Director" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

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
    "trailerUrl" TEXT,
    "seances" INTEGER NOT NULL DEFAULT 1,
    "directorId" INTEGER,
    "releaseCanDate" TIMESTAMP(3),

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmComment" (
    "id" SERIAL NOT NULL,
    "film_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "commentaire" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilmCountry" (
    "filmId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "FilmCountry_pkey" PRIMARY KEY ("filmId","countryId")
);

-- CreateTable
CREATE TABLE "FilmFilmTag" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "FilmFilmTag_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Interest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "film_id" INTEGER NOT NULL,
    "value" "InterestLevel" NOT NULL DEFAULT 'SANS_OPINION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
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
CREATE TABLE "Selection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'selection',
    "voteClosed" BOOLEAN NOT NULL DEFAULT false,
    "voteDate" TIMESTAMP(3),

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectionCinema" (
    "selectionId" INTEGER NOT NULL,
    "cinemaId" INTEGER NOT NULL,

    CONSTRAINT "SelectionCinema_pkey" PRIMARY KEY ("selectionId","cinemaId")
);

-- CreateTable
CREATE TABLE "SelectionFilm" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "selectionId" INTEGER NOT NULL,
    "commentaire" TEXT,
    "note" INTEGER,
    "category" TEXT,
    "score" DOUBLE PRECISION,
    "selected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SelectionFilm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "user_id" TEXT NOT NULL,
    "cinemaId" INTEGER,
    "role" TEXT DEFAULT 'INVITE',
    "username" TEXT,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,
    "note" INTEGER NOT NULL,
    "commentaire" TEXT,
    "cinemaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cinema_slug_key" ON "Cinema"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Director_name_key" ON "Director"("name" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "Film"("tmdbId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FilmComment_film_id_user_id_key" ON "FilmComment"("film_id" ASC, "user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FilmFilmTag_filmId_tagId_key" ON "FilmFilmTag"("filmId" ASC, "tagId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FilmTag_label_key" ON "FilmTag"("label" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Interest_user_id_film_id_key" ON "Interest"("user_id" ASC, "film_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SelectionFilm_filmId_selectionId_key" ON "SelectionFilm"("filmId" ASC, "selectionId" ASC);

-- CreateIndex
CREATE INDEX "UserProfile_cinemaId_idx" ON "UserProfile"("cinemaId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Vote_user_id_filmId_key" ON "Vote"("user_id" ASC, "filmId" ASC);

-- AddForeignKey
ALTER TABLE "Award" ADD CONSTRAINT "Award_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLink" ADD CONSTRAINT "ExternalLink_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Film" ADD CONSTRAINT "Film_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Director"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmComment" ADD CONSTRAINT "FilmComment_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmComment" ADD CONSTRAINT "FilmComment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "UserProfile"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmCountry" ADD CONSTRAINT "FilmCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmCountry" ADD CONSTRAINT "FilmCountry_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmFilmTag" ADD CONSTRAINT "FilmFilmTag_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilmFilmTag" ADD CONSTRAINT "FilmFilmTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "FilmTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interest" ADD CONSTRAINT "Interest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "UserProfile"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Programmation" ADD CONSTRAINT "Programmation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionCinema" ADD CONSTRAINT "SelectionCinema_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionCinema" ADD CONSTRAINT "SelectionCinema_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionFilm" ADD CONSTRAINT "SelectionFilm_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectionFilm" ADD CONSTRAINT "SelectionFilm_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "UserProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

