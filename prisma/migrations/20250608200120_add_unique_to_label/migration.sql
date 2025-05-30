/*
  Warnings:

  - A unique constraint covering the columns `[label]` on the table `FilmTag` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FilmTag_label_key" ON "FilmTag"("label");
