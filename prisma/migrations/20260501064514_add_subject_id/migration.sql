/*
  Warnings:

  - A unique constraint covering the columns `[subjectID]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `subjectID` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "subjectID" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_subjectID_key" ON "User"("subjectID");
