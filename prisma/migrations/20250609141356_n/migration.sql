-- CreateTable
CREATE TABLE "Award" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "prize" TEXT NOT NULL,
    "festival" TEXT NOT NULL,
    "year" INTEGER,
    "filmId" INTEGER NOT NULL,
    CONSTRAINT "Award_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExternalLink" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "url" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "filmId" INTEGER NOT NULL,
    CONSTRAINT "ExternalLink_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
