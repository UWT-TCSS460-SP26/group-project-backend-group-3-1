-- Rating / Review.userId: store local `User.id` (INTEGER). If columns are TEXT (subjectId FK), remap via User.subjectId.

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'Rating' AND c.column_name = 'userId'
      AND c.data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE "Rating" ADD COLUMN "_userId_int" INTEGER;
    UPDATE "Rating" r SET "_userId_int" = u."id" FROM "User" u WHERE r."userId" = u."subjectId";
    DELETE FROM "Rating" WHERE "_userId_int" IS NULL;
    ALTER TABLE "Rating" DROP CONSTRAINT IF EXISTS "Rating_userId_fkey";
    ALTER TABLE "Rating" DROP COLUMN "userId";
    ALTER TABLE "Rating" RENAME COLUMN "_userId_int" TO "userId";
    ALTER TABLE "Rating" ALTER COLUMN "userId" SET NOT NULL;
    ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $migration$;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = 'Review' AND c.column_name = 'userId'
      AND c.data_type IN ('text', 'character varying')
  ) THEN
    ALTER TABLE "Review" ADD COLUMN "_userId_int" INTEGER;
    UPDATE "Review" r SET "_userId_int" = u."id" FROM "User" u WHERE r."userId" = u."subjectId";
    DELETE FROM "Review" WHERE "_userId_int" IS NULL;
    ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
    ALTER TABLE "Review" DROP COLUMN "userId";
    ALTER TABLE "Review" RENAME COLUMN "_userId_int" TO "userId";
    ALTER TABLE "Review" ALTER COLUMN "userId" SET NOT NULL;
    ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $migration$;
