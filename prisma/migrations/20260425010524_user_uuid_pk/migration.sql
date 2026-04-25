/*
  Warnings:

  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `reviews` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `UserID` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `UserID` on the `reviews` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_UserID_fkey";

-- AlterTable
ALTER TABLE "User" DROP CONSTRAINT "User_pkey",
DROP COLUMN "UserID",
ADD COLUMN     "UserID" UUID NOT NULL,
ADD CONSTRAINT "User_pkey" PRIMARY KEY ("UserID");

-- AlterTable
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_pkey",
DROP COLUMN "UserID",
ADD COLUMN     "UserID" UUID NOT NULL,
ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("ReviewID", "UserID");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;
