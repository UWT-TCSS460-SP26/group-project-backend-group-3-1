-- CreateEnum
CREATE TYPE "Status" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "Issue" (
    "issueID" SERIAL NOT NULL,
    "issueStatus" "Status" NOT NULL,
    "issueDesc" TEXT NOT NULL,
    "issueReportDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("issueID")
);
