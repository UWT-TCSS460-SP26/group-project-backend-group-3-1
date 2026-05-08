-- Align Rating / Review.userId with Prisma: store auth `subjectId` (TEXT) and FK to User.subjectId.

ALTER TABLE "Rating" ADD COLUMN "userId_subject" TEXT;
UPDATE "Rating" r SET "userId_subject" = u."subjectId" FROM "User" u WHERE r."userId" = u."id";
DELETE FROM "Rating" WHERE "userId_subject" IS NULL;

ALTER TABLE "Rating" DROP CONSTRAINT IF EXISTS "Rating_userId_fkey";
ALTER TABLE "Rating" DROP COLUMN "userId";
ALTER TABLE "Rating" RENAME COLUMN "userId_subject" TO "userId";
ALTER TABLE "Rating" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("subjectId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Review" ADD COLUMN "userId_subject" TEXT;
UPDATE "Review" r SET "userId_subject" = u."subjectId" FROM "User" u WHERE r."userId" = u."id";
DELETE FROM "Review" WHERE "userId_subject" IS NULL;

ALTER TABLE "Review" DROP CONSTRAINT IF EXISTS "Review_userId_fkey";
ALTER TABLE "Review" DROP COLUMN "userId";
ALTER TABLE "Review" RENAME COLUMN "userId_subject" TO "userId";
ALTER TABLE "Review" ALTER COLUMN "userId" SET NOT NULL;

ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("subjectId") ON DELETE RESTRICT ON UPDATE CASCADE;
