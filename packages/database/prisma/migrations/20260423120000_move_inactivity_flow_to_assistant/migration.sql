-- AlterTable: add inactivityFlowRules to Assistant
ALTER TABLE "Assistant" ADD COLUMN     "inactivityFlowRules" JSONB NOT NULL DEFAULT '[]';

-- Migrate existing data: copy rules from Instance to its default Assistant
UPDATE "Assistant"
SET "inactivityFlowRules" = i."inactivityFlowRules"
FROM "Instance" i
WHERE i."defaultAssistantId" = "Assistant"."id"
  AND i."inactivityFlowRules" != '[]';

-- AlterTable: remove inactivityFlowRules from Instance
ALTER TABLE "Instance" DROP COLUMN "inactivityFlowRules";
