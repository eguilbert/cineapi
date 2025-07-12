-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."Film" (
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

    CONSTRAINT "Film_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Selection" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Selection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SelectionFilm" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "selectionId" INTEGER NOT NULL,
    "commentaire" TEXT,
    "note" INTEGER,
    "category" TEXT,

    CONSTRAINT "SelectionFilm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Director" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Director_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FilmCountry" (
    "filmId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "FilmCountry_pkey" PRIMARY KEY ("filmId","countryId")
);

-- CreateTable
CREATE TABLE "public"."Programmation" (
    "id" SERIAL NOT NULL,
    "jour" TEXT NOT NULL,
    "heure" TEXT NOT NULL,
    "salle" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Programmation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FilmTag" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "validated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FilmTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FilmFilmTag" (
    "id" SERIAL NOT NULL,
    "filmId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "FilmFilmTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Award" (
    "id" SERIAL NOT NULL,
    "prize" TEXT NOT NULL,
    "festival" TEXT NOT NULL,
    "year" INTEGER,
    "filmId" INTEGER NOT NULL,

    CONSTRAINT "Award_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExternalLink" (
    "id" SERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,

    CONSTRAINT "ExternalLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Cinema" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Cinema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "user_id" TEXT NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "role" TEXT DEFAULT 'INVITE',

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "public"."Vote" (
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
CREATE UNIQUE INDEX "Film_tmdbId_key" ON "public"."Film"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectionFilm_filmId_selectionId_key" ON "public"."SelectionFilm"("filmId", "selectionId");

-- CreateIndex
CREATE UNIQUE INDEX "Director_name_key" ON "public"."Director"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "public"."Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FilmTag_label_key" ON "public"."FilmTag"("label");

-- CreateIndex
CREATE UNIQUE INDEX "FilmFilmTag_filmId_tagId_key" ON "public"."FilmFilmTag"("filmId", "tagId");

-- CreateIndex
CREATE UNIQUE INDEX "Cinema_slug_key" ON "public"."Cinema"("slug");

-- CreateIndex
CREATE INDEX "UserProfile_cinemaId_idx" ON "public"."UserProfile"("cinemaId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_user_id_filmId_key" ON "public"."Vote"("user_id", "filmId");

-- AddForeignKey
ALTER TABLE "public"."Film" ADD CONSTRAINT "Film_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "public"."Director"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectionFilm" ADD CONSTRAINT "SelectionFilm_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SelectionFilm" ADD CONSTRAINT "SelectionFilm_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "public"."Selection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FilmCountry" ADD CONSTRAINT "FilmCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "public"."Country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FilmCountry" ADD CONSTRAINT "FilmCountry_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Programmation" ADD CONSTRAINT "Programmation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FilmFilmTag" ADD CONSTRAINT "FilmFilmTag_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FilmFilmTag" ADD CONSTRAINT "FilmFilmTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."FilmTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Award" ADD CONSTRAINT "Award_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExternalLink" ADD CONSTRAINT "ExternalLink_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "public"."Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "public"."Cinema"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."UserProfile"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

