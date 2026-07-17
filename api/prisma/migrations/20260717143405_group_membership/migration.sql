/*
  Warnings:

  - Added the required column `group_id` to the `votes` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "group_status" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "group_invite_status" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "vote_subject_type" AS ENUM ('PROJECT', 'MEMBER_REMOVAL');

-- DropIndex
DROP INDEX "group_members_group_id_user_id_key";

-- AlterTable
ALTER TABLE "groups" ADD COLUMN     "closed_at" TIMESTAMP(3),
ADD COLUMN     "status" "group_status" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "votes" ADD COLUMN     "group_id" TEXT NOT NULL,
ADD COLUMN     "subject_type" "vote_subject_type" NOT NULL DEFAULT 'PROJECT',
ADD COLUMN     "target_member_id" TEXT,
ALTER COLUMN "project_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "group_invites" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "group_invite_status" NOT NULL DEFAULT 'PENDING',
    "invited_by_member_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "group_invites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_invites_token_hash_idx" ON "group_invites"("token_hash");

-- CreateIndex
CREATE INDEX "group_invites_group_id_email_status_idx" ON "group_invites"("group_id", "email", "status");

-- CreateIndex
CREATE INDEX "group_members_group_id_user_id_idx" ON "group_members"("group_id", "user_id");

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_invited_by_member_id_fkey" FOREIGN KEY ("invited_by_member_id") REFERENCES "group_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_target_member_id_fkey" FOREIGN KEY ("target_member_id") REFERENCES "group_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
