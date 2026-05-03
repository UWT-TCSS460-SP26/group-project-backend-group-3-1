-- User: Auth² subject + profile fields; migrate PK from TEXT to SERIAL
UPDATE "User" SET "subjectId" = "id" WHERE "subjectId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "subjectId" SET NOT NULL;
ALTER TABLE "User" ADD COLUMN "id_int" SERIAL NOT NULL;

-- Rating / Review: map TEXT userId to new integer User.id
ALTER TABLE "Rating" ADD COLUMN "userId_int" INTEGER;
UPDATE "Rating" r SET "userId_int" = u."id_int" FROM "User" u WHERE r."userId" = u."id"::text;
ALTER TABLE "Rating" ALTER COLUMN "userId_int" SET NOT NULL;

ALTER TABLE "Review" ADD COLUMN "userId_int" INTEGER;
UPDATE "Review" r SET "userId_int" = u."id_int" FROM "User" u WHERE r."userId" = u."id"::text;
ALTER TABLE "Review" ALTER COLUMN "userId_int" SET NOT NULL;

ALTER TABLE "Rating" DROP CONSTRAINT "Rating_userId_fkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

ALTER TABLE "Rating" DROP CONSTRAINT "Rating_pkey";
ALTER TABLE "Review" DROP CONSTRAINT "Review_pkey";

ALTER TABLE "Rating" DROP COLUMN "userId";
ALTER TABLE "Rating" RENAME COLUMN "userId_int" TO "userId";
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_pkey" PRIMARY KEY ("ratingId");

ALTER TABLE "Review" DROP COLUMN "userId";
ALTER TABLE "Review" RENAME COLUMN "userId_int" TO "userId";
ALTER TABLE "Review" ADD CONSTRAINT "Review_pkey" PRIMARY KEY ("reviewId");

ALTER TABLE "User" DROP CONSTRAINT "User_pkey";
ALTER TABLE "User" DROP COLUMN "id";
ALTER TABLE "User" RENAME COLUMN "id_int" TO "id";
ALTER TABLE "User" ADD CONSTRAINT "User_pkey" PRIMARY KEY ("id");

ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Issue tracker (routes land in a later sprint)
CREATE TYPE "IssueStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');
