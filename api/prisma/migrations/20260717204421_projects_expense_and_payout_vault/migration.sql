-- AlterEnum
ALTER TYPE "flow_source_type" ADD VALUE 'PROJECT_EXPENSE';

-- DropIndex
DROP INDEX "flow_rules_replaces_rule_id_idx";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "payout_vault_id" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_payout_vault_id_fkey" FOREIGN KEY ("payout_vault_id") REFERENCES "vaults"("id") ON DELETE SET NULL ON UPDATE CASCADE;
