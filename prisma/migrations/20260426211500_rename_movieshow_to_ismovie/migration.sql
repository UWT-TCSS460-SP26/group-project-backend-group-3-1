-- Rename boolean column: clearer name (true = movie, false = show)
ALTER TABLE "Rating" RENAME COLUMN "movieShow" TO "isMovie";
ALTER TABLE "Review" RENAME COLUMN "movieShow" TO "isMovie";
