-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "defaultAssistantId" TEXT;

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_defaultAssistantId_fkey" FOREIGN KEY ("defaultAssistantId") REFERENCES "Assistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
