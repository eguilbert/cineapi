-- DropForeignKey
ALTER TABLE "public"."UserProfile" DROP CONSTRAINT "UserProfile_cinemaId_fkey";

-- AlterTable
ALTER TABLE "public"."UserProfile" ALTER COLUMN "cinemaId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."UserProfile" ADD CONSTRAINT "UserProfile_cinemaId_fkey" FOREIGN KEY ("cinemaId") REFERENCES "public"."Cinema"("id") ON DELETE SET NULL ON UPDATE CASCADE;
