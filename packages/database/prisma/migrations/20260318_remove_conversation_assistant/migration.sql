-- Remove assistantId from Conversation
-- The FK constraint must be dropped before the column
ALTER TABLE "Conversation" DROP CONSTRAINT IF EXISTS "Conversation_assistantId_fkey";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "assistantId";
