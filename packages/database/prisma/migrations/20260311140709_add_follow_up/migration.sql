-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('MESSAGE', 'CALL', 'MEETING', 'PROPOSAL', 'PAYMENT');

-- CreateEnum
CREATE TYPE "FollowUpMode" AS ENUM ('REMINDER', 'AUTOMATIC');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'NOTIFIED', 'SENT', 'CANCELLED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'FOLLOW_UP_DUE';

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "dealId" TEXT,
    "createdById" TEXT NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "mode" "FollowUpMode" NOT NULL DEFAULT 'REMINDER',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "notifiedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_tenantId_idx" ON "FollowUp"("tenantId");

-- CreateIndex
CREATE INDEX "FollowUp_conversationId_idx" ON "FollowUp"("conversationId");

-- CreateIndex
CREATE INDEX "FollowUp_dealId_idx" ON "FollowUp"("dealId");

-- CreateIndex
CREATE INDEX "FollowUp_status_scheduledAt_idx" ON "FollowUp"("status", "scheduledAt");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
