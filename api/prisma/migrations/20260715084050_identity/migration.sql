/*
  Warnings:

  - The primary key for the `member_share_cache` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `member_share_cache` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- CreateEnum
CREATE TYPE "AppRoleType" AS ENUM ('ADMIN', 'USER');

-- AlterTable
ALTER TABLE "member_share_cache" DROP CONSTRAINT "member_share_cache_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "member_share_cache_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" "AppRoleType" NOT NULL DEFAULT 'USER';

-- CreateIndex
CREATE INDEX "member_share_cache_group_id_member_id_idx" ON "member_share_cache"("group_id", "member_id");
