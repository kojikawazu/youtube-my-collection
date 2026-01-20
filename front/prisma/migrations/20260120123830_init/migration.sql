-- CreateTable
CREATE TABLE "VideoEntry" (
    "id" TEXT NOT NULL,
    "youtubeUrl" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "tags" TEXT[],
    "category" TEXT NOT NULL,
    "goodPoints" TEXT NOT NULL,
    "memo" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "publishDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoEntry_createdAt_idx" ON "VideoEntry"("createdAt");

-- CreateIndex
CREATE INDEX "VideoEntry_rating_idx" ON "VideoEntry"("rating");

-- CreateIndex
CREATE INDEX "VideoEntry_publishDate_idx" ON "VideoEntry"("publishDate");
