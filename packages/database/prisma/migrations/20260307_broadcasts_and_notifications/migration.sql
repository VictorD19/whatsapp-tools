-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BroadcastMessageType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "BroadcastRecipientStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- CreateEnum
CREATE TYPE "BroadcastSourceType" AS ENUM ('CONTACT_LIST', 'GROUP');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MESSAGE', 'CONVERSATION_ASSIGNED', 'CONVERSATION_TRANSFERRED', 'CONVERSATIONS_IMPORTED', 'INSTANCE_CONNECTED', 'INSTANCE_DISCONNECTED', 'INSTANCE_BANNED', 'DEAL_WON', 'DEAL_LOST', 'DEAL_ASSIGNED', 'GROUP_EXTRACTION_COMPLETED', 'BROADCAST_COMPLETED', 'BROADCAST_FAILED');

-- CreateTable: Broadcast
CREATE TABLE "Broadcast" (
    "id"           TEXT NOT NULL,
    "tenantId"     TEXT NOT NULL,
    "createdById"  TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "status"       "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "messageType"  "BroadcastMessageType" NOT NULL DEFAULT 'TEXT',
    "messageTexts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mediaUrl"     TEXT,
    "caption"      TEXT,
    "fileName"     TEXT,
    "delay"        INTEGER NOT NULL DEFAULT 5,
    "totalCount"   INTEGER NOT NULL DEFAULT 0,
    "sentCount"    INTEGER NOT NULL DEFAULT 0,
    "failedCount"  INTEGER NOT NULL DEFAULT 0,
    "scheduledAt"  TIMESTAMP(3),
    "startedAt"    TIMESTAMP(3),
    "completedAt"  TIMESTAMP(3),
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,
    "deletedAt"    TIMESTAMP(3),
    CONSTRAINT "Broadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BroadcastVariation
CREATE TABLE "BroadcastVariation" (
    "id"          TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "messageType" "BroadcastMessageType" NOT NULL DEFAULT 'TEXT',
    "text"        TEXT NOT NULL DEFAULT '',
    "mediaUrl"    TEXT,
    "fileName"    TEXT,
    "sortOrder"   INTEGER NOT NULL DEFAULT 0,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BroadcastVariation_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BroadcastInstance
CREATE TABLE "BroadcastInstance" (
    "broadcastId" TEXT NOT NULL,
    "instanceId"  TEXT NOT NULL,
    CONSTRAINT "BroadcastInstance_pkey" PRIMARY KEY ("broadcastId", "instanceId")
);

-- CreateTable: BroadcastSource
CREATE TABLE "BroadcastSource" (
    "id"            TEXT NOT NULL,
    "broadcastId"   TEXT NOT NULL,
    "sourceType"    "BroadcastSourceType" NOT NULL,
    "contactListId" TEXT,
    "groupJid"      TEXT,
    "groupName"     TEXT,
    CONSTRAINT "BroadcastSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable: BroadcastRecipient
CREATE TABLE "BroadcastRecipient" (
    "id"           TEXT NOT NULL,
    "broadcastId"  TEXT NOT NULL,
    "contactId"    TEXT NOT NULL,
    "phone"        TEXT NOT NULL,
    "name"         TEXT,
    "status"       "BroadcastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt"       TIMESTAMP(3),
    "failedReason" TEXT,
    CONSTRAINT "BroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Notification
CREATE TABLE "Notification" (
    "id"        TEXT NOT NULL,
    "tenantId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "type"      "NotificationType" NOT NULL,
    "title"     TEXT NOT NULL,
    "body"      TEXT NOT NULL,
    "read"      BOOLEAN NOT NULL DEFAULT false,
    "readAt"    TIMESTAMP(3),
    "data"      JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NotificationPreference
CREATE TABLE "NotificationPreference" (
    "id"      TEXT NOT NULL,
    "userId"  TEXT NOT NULL,
    "type"    "NotificationType" NOT NULL,
    "inApp"   BOOLEAN NOT NULL DEFAULT true,
    "browser" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Add Broadcast relation to Tenant
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "broadcasts" TEXT;

-- Foreign Keys
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Broadcast" ADD CONSTRAINT "Broadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BroadcastVariation" ADD CONSTRAINT "BroadcastVariation_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastInstance" ADD CONSTRAINT "BroadcastInstance_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastInstance" ADD CONSTRAINT "BroadcastInstance_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "Instance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastSource" ADD CONSTRAINT "BroadcastSource_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastSource" ADD CONSTRAINT "BroadcastSource_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "Broadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BroadcastRecipient" ADD CONSTRAINT "BroadcastRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Unique constraint
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_type_key" UNIQUE ("userId", "type");

-- Indexes
CREATE INDEX "Broadcast_tenantId_idx" ON "Broadcast"("tenantId");
CREATE INDEX "Broadcast_tenantId_status_idx" ON "Broadcast"("tenantId", "status");
CREATE INDEX "Broadcast_status_scheduledAt_idx" ON "Broadcast"("status", "scheduledAt");
CREATE INDEX "BroadcastVariation_broadcastId_idx" ON "BroadcastVariation"("broadcastId");
CREATE INDEX "BroadcastInstance_instanceId_idx" ON "BroadcastInstance"("instanceId");
CREATE INDEX "BroadcastSource_broadcastId_idx" ON "BroadcastSource"("broadcastId");
CREATE INDEX "BroadcastRecipient_broadcastId_status_idx" ON "BroadcastRecipient"("broadcastId", "status");
CREATE INDEX "BroadcastRecipient_contactId_idx" ON "BroadcastRecipient"("contactId");
CREATE INDEX "Notification_tenantId_idx" ON "Notification"("tenantId");
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");
