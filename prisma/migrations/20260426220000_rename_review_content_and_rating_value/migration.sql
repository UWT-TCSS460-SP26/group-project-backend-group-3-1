-- Align DB column names with Prisma (safe if already renamed)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Review' AND column_name = 'content'
  ) THEN
    ALTER TABLE "Review" RENAME COLUMN "content" TO "reviewContent";
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Rating' AND column_name = 'value'
  ) THEN
    ALTER TABLE "Rating" RENAME COLUMN "value" TO "rating";
  END IF;
END $$;
