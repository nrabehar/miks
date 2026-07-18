-- AlterEnum
ALTER TYPE "device_status" ADD VALUE 'PENDING' BEFORE 'ACTIVE';

-- AlterTable
ALTER TABLE "verification_tokens" ADD COLUMN     "device_id" TEXT;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
