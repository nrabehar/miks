-- AlterTable
ALTER TABLE "flux_rule_destinations" ADD COLUMN     "percentParam" TEXT;

-- AlterTable
ALTER TABLE "flux_rules" ADD COLUMN     "params" JSONB;
