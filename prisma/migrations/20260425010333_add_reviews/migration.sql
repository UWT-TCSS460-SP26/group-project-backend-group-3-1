-- CreateTable
CREATE TABLE "User" (
    "UserID" SERIAL NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("UserID")
);

-- CreateTable
CREATE TABLE "reviews" (
    "ReviewID" SERIAL NOT NULL,
    "UserID" INTEGER NOT NULL,
    "Content" INTEGER NOT NULL,
    "DateOfReview" DATE NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("ReviewID","UserID")
);

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_UserID_fkey" FOREIGN KEY ("UserID") REFERENCES "User"("UserID") ON DELETE CASCADE ON UPDATE CASCADE;
