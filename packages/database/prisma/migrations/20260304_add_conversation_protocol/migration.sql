-- Add protocol settings to Tenant
ALTER TABLE "Tenant" ADD COLUMN "protocolPrefix" TEXT NOT NULL DEFAULT 'SCHA';
ALTER TABLE "Tenant" ADD COLUMN "protocolSeq" INTEGER NOT NULL DEFAULT 999;

-- Add protocol column to Conversation (nullable initially for backfill)
ALTER TABLE "Conversation" ADD COLUMN "protocol" TEXT;

-- Backfill existing conversations with sequential protocols per tenant
WITH numbered AS (
  SELECT
    c."id",
    c."tenantId",
    ROW_NUMBER() OVER (PARTITION BY c."tenantId" ORDER BY c."createdAt") + 999 AS seq
  FROM "Conversation" c
)
UPDATE "Conversation" c
SET "protocol" = t."protocolPrefix" || numbered.seq::TEXT
FROM numbered
JOIN "Tenant" t ON t."id" = numbered."tenantId"
WHERE c."id" = numbered."id";

-- Update tenant protocolSeq to reflect backfilled count
UPDATE "Tenant" t
SET "protocolSeq" = COALESCE(
  (SELECT MAX(ROW_NUMBER) FROM (
    SELECT ROW_NUMBER() OVER (ORDER BY c."createdAt") AS ROW_NUMBER
    FROM "Conversation" c
    WHERE c."tenantId" = t."id"
  ) sub),
  0
) + 999;

-- Make protocol NOT NULL after backfill
ALTER TABLE "Conversation" ALTER COLUMN "protocol" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "Conversation_tenantId_protocol_key" ON "Conversation"("tenantId", "protocol");
