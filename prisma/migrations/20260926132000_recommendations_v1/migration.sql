-- CreateTable
CREATE TABLE "public"."CinemaProfile" (
    "cinemaId" INTEGER NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "favoredTerms" JSONB NOT NULL DEFAULT '[]',
    "avoidedTerms" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CinemaProfile_pkey" PRIMARY KEY ("cinemaId")
);

-- CreateTable
CREATE TABLE "public"."FilmRecommendation" (
    "id" SERIAL NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "filmId" INTEGER NOT NULL,
    "editorialFit" INTEGER,
    "audienceFit" INTEGER,
    "criticalInterest" INTEGER,
    "discoveryValue" INTEGER,
    "recommendedWeek" INTEGER,
    "recommendedShows" INTEGER,
    "reasoning" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilmRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RecommendationFeedback" (
    "id" SERIAL NOT NULL,
    "recommendationId" INTEGER NOT NULL,
    "cinemaId" INTEGER NOT NULL,
    "decision" TEXT NOT NULL,
    "plannedShows" INTEGER,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FilmRecommendation_cinemaId_filmId_key" ON "public"."FilmRecommendation"("cinemaId", "filmId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationFeedback_recommendationId_key" ON "public"."RecommendationFeedback"("recommendationId");

-- AddForeignKey
ALTER TABLE "public"."CinemaProfile" ADD CONSTRAINT "CinemaProfile_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "public"."Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FilmRecommendation" ADD CONSTRAINT "FilmRecommendation_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "public"."Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FilmRecommendation" ADD CONSTRAINT "FilmRecommendation_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "public"."Film"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "public"."FilmRecommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "public"."Cinema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

