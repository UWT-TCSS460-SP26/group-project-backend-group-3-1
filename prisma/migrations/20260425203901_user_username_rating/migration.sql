-- AlterTable
ALTER TABLE "User" ADD COLUMN     "email" TEXT,
ADD COLUMN     "username" VARCHAR(20) NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "Rating" (
    "ratingId" SERIAL NOT NULL,
    "userId" UUID NOT NULL,
    "movieShow" BOOLEAN NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("ratingId","userId")
);

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;
