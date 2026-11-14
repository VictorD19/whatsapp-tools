-- Isolated Instagram tables only. Passive deliveries must never authorize replies.
ALTER TABLE "InstagramConversation"
  ADD COLUMN "lastWebhookChannel" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "lastWebhookMessageAt" TIMESTAMP(3);
