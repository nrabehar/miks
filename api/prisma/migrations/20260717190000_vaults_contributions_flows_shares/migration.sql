-- AlterEnum
ALTER TYPE "transaction_type" ADD VALUE 'WITHDRAWAL';

-- AlterTable
ALTER TABLE "contributions" ADD COLUMN "reversed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "flow_destinations" ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "flow_rules" ADD COLUMN "replaces_rule_id" TEXT;

-- CreateIndex
CREATE INDEX "flow_rules_replaces_rule_id_idx" ON "flow_rules"("replaces_rule_id");

-- AddForeignKey
ALTER TABLE "flow_rules" ADD CONSTRAINT "flow_rules_replaces_rule_id_fkey" FOREIGN KEY ("replaces_rule_id") REFERENCES "flow_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
