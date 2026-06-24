/*
  Warnings:

  - You are about to drop the column `enabled2FA` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "enabled2FA",
ADD COLUMN     "twoFaEnabled" BOOLEAN NOT NULL DEFAULT false;
