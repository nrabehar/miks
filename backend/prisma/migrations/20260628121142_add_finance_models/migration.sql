-- AlterTable
ALTER TABLE "workspace_members" ADD COLUMN     "pinHash" TEXT;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'MGA',
ADD COLUMN     "description" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- CreateTable
CREATE TABLE "vault_configs" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "c1Ratio" DECIMAL(5,2) NOT NULL DEFAULT 60,
    "c2Ratio" DECIMAL(5,2) NOT NULL DEFAULT 30,
    "c3Ratio" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vault_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cotisations" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cotisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "vault" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MGA',
    "description" TEXT,
    "referenceId" TEXT,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invite_tokens" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "email" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invite_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vault_configs_workspaceId_key" ON "vault_configs"("workspaceId");

-- CreateIndex
CREATE INDEX "cotisations_workspaceId_idx" ON "cotisations"("workspaceId");

-- CreateIndex
CREATE INDEX "cotisations_memberId_idx" ON "cotisations"("memberId");

-- CreateIndex
CREATE INDEX "cotisations_workspaceId_year_month_idx" ON "cotisations"("workspaceId", "year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "cotisations_workspaceId_memberId_month_year_key" ON "cotisations"("workspaceId", "memberId", "month", "year");

-- CreateIndex
CREATE INDEX "ledger_entries_workspaceId_idx" ON "ledger_entries"("workspaceId");

-- CreateIndex
CREATE INDEX "ledger_entries_workspaceId_vault_idx" ON "ledger_entries"("workspaceId", "vault");

-- CreateIndex
CREATE INDEX "ledger_entries_workspaceId_createdAt_idx" ON "ledger_entries"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "ledger_entries_referenceId_idx" ON "ledger_entries"("referenceId");

-- CreateIndex
CREATE UNIQUE INDEX "invite_tokens_token_key" ON "invite_tokens"("token");

-- CreateIndex
CREATE INDEX "invite_tokens_workspaceId_idx" ON "invite_tokens"("workspaceId");

-- CreateIndex
CREATE INDEX "invite_tokens_token_idx" ON "invite_tokens"("token");

-- AddForeignKey
ALTER TABLE "vault_configs" ADD CONSTRAINT "vault_configs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cotisations" ADD CONSTRAINT "cotisations_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "workspace_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_tokens" ADD CONSTRAINT "invite_tokens_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;
