-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('TIMELINE', 'FAMILY_TREE', 'MAP');

-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('EVENT', 'PROCESS', 'PERIOD');

-- CreateEnum
CREATE TYPE "ShareMethod" AS ENUM ('LINK', 'QR');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "type" "MaterialType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "coverImage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineItem" (
    "id" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "kind" "ItemKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startYear" INTEGER NOT NULL,
    "endYear" INTEGER,
    "day" INTEGER,
    "month" INTEGER,
    "icon" TEXT,
    "color" TEXT,
    "imageUrl" TEXT,

    CONSTRAINT "TimelineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShareLink" (
    "id" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "method" "ShareMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Material_ownerId_type_idx" ON "Material"("ownerId", "type");

-- CreateIndex
CREATE INDEX "TimelineItem_materialId_position_idx" ON "TimelineItem"("materialId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_materialId_key" ON "ShareLink"("materialId");

-- CreateIndex
CREATE UNIQUE INDEX "ShareLink_token_key" ON "ShareLink"("token");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data integrity checks that Prisma can't express (Q: consistent timelines).
-- An event may have no icon: only processes and periods are forbidden to have one.
ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_kind_fields_chk" CHECK (
  (
    "kind" = 'EVENT'
    AND "endYear" IS NULL
    AND "color" IS NULL
    AND (("day" IS NULL) = ("month" IS NULL))
  ) OR (
    "kind" IN ('PROCESS', 'PERIOD')
    AND "endYear" IS NOT NULL
    AND "endYear" >= "startYear"
    AND "color" IS NOT NULL
    AND "icon" IS NULL
    AND "day" IS NULL
    AND "month" IS NULL
  )
);

ALTER TABLE "TimelineItem" ADD CONSTRAINT "TimelineItem_date_range_chk" CHECK (
  ("month" IS NULL OR "month" BETWEEN 1 AND 12) AND ("day" IS NULL OR "day" BETWEEN 1 AND 31)
);
