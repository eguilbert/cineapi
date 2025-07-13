-- CreateEnum
CREATE TYPE "public"."InterestLevel" AS ENUM ('SANS_OPINION', 'NOT_INTERESTED', 'CURIOUS', 'MUST_SEE');

-- CreateTable
CREATE TABLE "public"."Interest" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "film_id" INTEGER NOT NULL,
    "value" "public"."InterestLevel" NOT NULL DEFAULT 'SANS_OPINION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Interest_user_id_film_id_key" ON "public"."Interest"("user_id", "film_id");

-- AddForeignKey
ALTER TABLE "public"."Interest" ADD CONSTRAINT "Interest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."UserProfile"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Interest" ADD CONSTRAINT "Interest_film_id_fkey" FOREIGN KEY ("film_id") REFERENCES "public"."Film"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
