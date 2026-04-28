-- AlterTable
ALTER TABLE "Rating" ADD COLUMN     "tmdbIdentifier" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Review" ADD COLUMN     "tmdbIdentifier" INTEGER NOT NULL DEFAULT 0;
