-- Add composite index on Message(conversationId, sentAt DESC)
-- Fixes slow query on inbox/conversations endpoint:
-- Prisma's include+take generates a query WITHOUT LIMIT, fetching all messages
-- in memory. This index allows DISTINCT ON query to use an index scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Message_conversationId_sentAt_idx"
  ON "Message" ("conversationId", "sentAt" DESC);
