/*
  Warnings:

  - You are about to drop the column `accessTokenExpiresAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `idToken` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `refreshTokenExpiresAt` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `accounts` table. All the data in the column will be lost.
  - You are about to drop the column `outcome` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `userAgent` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `month` on the `cotisations` table. All the data in the column will be lost.
  - You are about to drop the column `validatedAt` on the `cotisations` table. All the data in the column will be lost.
  - You are about to drop the column `validatedById` on the `cotisations` table. All the data in the column will be lost.
  - You are about to drop the column `year` on the `cotisations` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `invite_tokens` table. All the data in the column will be lost.
  - You are about to drop the column `vault` on the `ledger_entries` table. All the data in the column will be lost.
  - You are about to drop the column `browser` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `familyId` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `lastUsedAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `os` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `lastActiveAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `tokenSecret` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `activityScore` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the column `exitRequestedAt` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the column `pinHash` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `workspace_members` table. All the data in the column will be lost.
  - You are about to alter the column `totalShares` on the `workspace_members` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to drop the `vault_configs` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `recordedById` to the `cotisations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `invite_tokens` table without a default value. This is not possible if the table is not empty.
  - Added the required column `vaultType` to the `ledger_entries` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `workspaces` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "cotisations" DROP CONSTRAINT "cotisations_memberId_fkey";

-- DropForeignKey
ALTER TABLE "vault_configs" DROP CONSTRAINT "vault_configs_workspaceId_fkey";

-- DropIndex
DROP INDEX "audit_logs_createdAt_idx";

-- DropIndex
DROP INDEX "audit_logs_event_idx";

-- DropIndex
DROP INDEX "audit_logs_userId_createdAt_idx";

-- DropIndex
DROP INDEX "cotisations_memberId_idx";

-- DropIndex
DROP INDEX "cotisations_workspaceId_idx";

-- DropIndex
DROP INDEX "cotisations_workspaceId_memberId_month_year_key";

-- DropIndex
DROP INDEX "cotisations_workspaceId_year_month_idx";

-- DropIndex
DROP INDEX "ledger_entries_referenceId_idx";

-- DropIndex
DROP INDEX "ledger_entries_workspaceId_idx";

-- DropIndex
DROP INDEX "ledger_entries_workspaceId_vault_idx";

-- DropIndex
DROP INDEX "sessions_familyId_idx";

-- DropIndex
DROP INDEX "sessions_userId_revokedAt_idx";

-- DropIndex
DROP INDEX "users_email_phone_username_idx";

-- AlterTable
ALTER TABLE "accounts" DROP COLUMN "accessTokenExpiresAt",
DROP COLUMN "idToken",
DROP COLUMN "refreshTokenExpiresAt",
DROP COLUMN "scope";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "outcome",
DROP COLUMN "userAgent",
ADD COLUMN     "memberId" TEXT,
ADD COLUMN     "workspaceId" TEXT;

-- AlterTable
ALTER TABLE "cotisations" DROP COLUMN "month",
DROP COLUMN "validatedAt",
DROP COLUMN "validatedById",
DROP COLUMN "year",
ADD COLUMN     "period" TEXT,
ADD COLUMN     "recordedById" TEXT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "invite_tokens" DROP COLUMN "role",
ADD COLUMN     "createdById" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ledger_entries" DROP COLUMN "vault",
ADD COLUMN     "referenceType" TEXT,
ADD COLUMN     "vaultId" TEXT,
ADD COLUMN     "vaultType" TEXT NOT NULL,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "browser",
DROP COLUMN "familyId",
DROP COLUMN "lastUsedAt",
DROP COLUMN "location",
DROP COLUMN "os",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "bio",
DROP COLUMN "lastActiveAt",
DROP COLUMN "name",
DROP COLUMN "tokenSecret",
ALTER COLUMN "avatarUrl" DROP DEFAULT,
ALTER COLUMN "language" SET DEFAULT 'fr';

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "activityScore",
DROP COLUMN "createdAt",
DROP COLUMN "exitRequestedAt",
DROP COLUMN "pinHash",
DROP COLUMN "role",
ADD COLUMN     "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "sharePercent" DECIMAL(7,4) NOT NULL DEFAULT 0,
ALTER COLUMN "totalShares" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "creatorId" TEXT NOT NULL;

-- DropTable
DROP TABLE "vault_configs";

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "workspaceId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "referenceType" TEXT,
    "referenceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vaults" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_withdrawable_vaults" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "totalReceived" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_withdrawable_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flux_rules" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "flux_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flux_rule_destinations" (
    "id" TEXT NOT NULL,
    "fluxRuleId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetVaultId" TEXT,
    "percent" DECIMAL(7,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "flux_rule_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL,
    "quorum" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "result" TEXT,
    "yesCount" INTEGER NOT NULL DEFAULT 0,
    "noCount" INTEGER NOT NULL DEFAULT 0,
    "abstainCount" INTEGER NOT NULL DEFAULT 0,
    "opensAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote_choices" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "sourceVaultId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "budget" DECIMAL(14,2),
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "status" TEXT NOT NULL DEFAULT 'PENDING_VOTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_vaults" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_vaults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_flux_rules" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "destinations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_flux_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_workspaceId_idx" ON "notifications"("workspaceId");

-- CreateIndex
CREATE INDEX "vaults_workspaceId_idx" ON "vaults"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "member_withdrawable_vaults_memberId_key" ON "member_withdrawable_vaults"("memberId");

-- CreateIndex
CREATE INDEX "member_withdrawable_vaults_workspaceId_idx" ON "member_withdrawable_vaults"("workspaceId");

-- CreateIndex
CREATE INDEX "flux_rules_workspaceId_isActive_idx" ON "flux_rules"("workspaceId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "votes_projectId_key" ON "votes"("projectId");

-- CreateIndex
CREATE INDEX "votes_workspaceId_status_idx" ON "votes"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vote_choices_voteId_memberId_key" ON "vote_choices"("voteId", "memberId");

-- CreateIndex
CREATE INDEX "projects_workspaceId_status_idx" ON "projects"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "project_vaults_projectId_idx" ON "project_vaults"("projectId");

-- CreateIndex
CREATE INDEX "project_flux_rules_projectId_idx" ON "project_flux_rules"("projectId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_workspaceId_createdAt_idx" ON "audit_logs"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "cotisations_workspaceId_memberId_idx" ON "cotisations"("workspaceId", "memberId");

-- CreateIndex
CREATE INDEX "cotisations_workspaceId_period_idx" ON "cotisations"("workspaceId", "period");

-- CreateIndex
CREATE INDEX "invite_tokens_email_idx" ON "invite_tokens"("email");

-- CreateIndex
CREATE INDEX "ledger_entries_vaultId_idx" ON "ledger_entries"("vaultId");

-- CreateIndex
CREATE INDEX "ledger_entries_referenceId_referenceType_idx" ON "ledger_entries"("referenceId", "referenceType");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "workspace_members_workspaceId_idx" ON "workspace_members"("workspaceId");

-- CreateIndex
CREATE INDEX "workspace_members_userId_idx" ON "workspace_members"("userId");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vaults" ADD CONSTRAINT "vaults_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_withdrawable_vaults" ADD CONSTRAINT "member_withdrawable_vaults_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_withdrawable_vaults" ADD CONSTRAINT "member_withdrawable_vaults_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_vaultId_fkey" FOREIGN KEY ("vaultId") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flux_rules" ADD CONSTRAINT "flux_rules_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flux_rule_destinations" ADD CONSTRAINT "flux_rule_destinations_fluxRuleId_fkey" FOREIGN KEY ("fluxRuleId") REFERENCES "flux_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flux_rule_destinations" ADD CONSTRAINT "flux_rule_destinations_targetVaultId_fkey" FOREIGN KEY ("targetVaultId") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_choices" ADD CONSTRAINT "vote_choices_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "votes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote_choices" ADD CONSTRAINT "vote_choices_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_sourceVaultId_fkey" FOREIGN KEY ("sourceVaultId") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_vaults" ADD CONSTRAINT "project_vaults_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_flux_rules" ADD CONSTRAINT "project_flux_rules_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "workspace_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
