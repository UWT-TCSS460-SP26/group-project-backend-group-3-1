-- User: Auth² subject + profile fields; migrate PK from TEXT to SERIAL
ALTER TABLE "User" ADD COLUMN "subjectId" TEXT;
UPDATE "User" SET "subjectId" = "id" WHERE "subjectId" IS NULL;
ALTER TABLE "User" ALTER COLUMN "subjectId" SET NOT NULL;
CREATE UNIQUE INDEX "User_subjectId_key" ON "User"("subjectId");

ALTER TABLE "User" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "User" ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';

ALTER TABLE "User" ADD COLUMN "id_int" SERIAL NOT NULL;

-- Rating / Review: map TEXT userId to new integer User.id
ALTER TABLE "Rating" ADD COLUMN "userId_int" INTEGER;
UPDATE "Rating" r SET "userId_int" = u."id_int" FROM "User" u WHERE r."userId" = u."id";
ALTER TABLE "Rating" ALTER COLUMN "userId_int" SET NOT NULL;

ALTER TABLE "Review" ADD COLUMN "userId_int" INTEGER;
UPDATE "Review" r SET "userId_int" = u."id_int" FROM "User" u WHERE r."userId" = u."id";
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

CREATE TABLE "Issue" (
    "issueId" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "IssueStatus" NOT NULL DEFAULT 'OPEN',
    "reporterId" INTEGER NOT NULL,
    "assigneeId" INTEGER,
    "isMovie" BOOLEAN,
    "tmdbIdentifier" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("issueId")
);

ALTER TABLE "Issue" ADD CONSTRAINT "Issue_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
