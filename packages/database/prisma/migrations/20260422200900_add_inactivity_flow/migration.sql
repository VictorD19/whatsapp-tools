-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "lastInactivityAt" TIMESTAMP(3),
ADD COLUMN     "lastInactivityStep" INTEGER;

-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "inactivityFlowRules" JSONB NOT NULL DEFAULT '[]';
