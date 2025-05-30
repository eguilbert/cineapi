-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SelectionFilm" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "filmId" INTEGER NOT NULL,
    "selectionId" INTEGER NOT NULL,
    "commentaire" TEXT,
    "note" INTEGER,
    "category" TEXT,
    CONSTRAINT "SelectionFilm_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SelectionFilm_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "Selection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SelectionFilm" ("category", "commentaire", "filmId", "id", "note", "selectionId") SELECT "category", "commentaire", "filmId", "id", "note", "selectionId" FROM "SelectionFilm";
DROP TABLE "SelectionFilm";
ALTER TABLE "new_SelectionFilm" RENAME TO "SelectionFilm";
CREATE UNIQUE INDEX "SelectionFilm_filmId_selectionId_key" ON "SelectionFilm"("filmId", "selectionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
