-- CreateTable
CREATE TABLE "InstagramAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instagramId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'simulated',
    "accessToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "lastInboundAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramMessage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "requestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'received',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_instagramId_key" ON "InstagramAccount"("instagramId");

-- CreateIndex
CREATE INDEX "InstagramAccount_tenantId_active_idx" ON "InstagramAccount"("tenantId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAccount_id_tenantId_key" ON "InstagramAccount"("id", "tenantId");

-- CreateIndex
CREATE INDEX "InstagramConversation_tenantId_updatedAt_idx" ON "InstagramConversation"("tenantId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConversation_accountId_participantId_key" ON "InstagramConversation"("accountId", "participantId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramConversation_id_tenantId_key" ON "InstagramConversation"("id", "tenantId");

-- CreateIndex
CREATE INDEX "InstagramMessage_tenantId_conversationId_sentAt_idx" ON "InstagramMessage"("tenantId", "conversationId", "sentAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMessage_accountId_providerMessageId_key" ON "InstagramMessage"("accountId", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramMessage_accountId_requestId_key" ON "InstagramMessage"("accountId", "requestId");

-- AddForeignKey
ALTER TABLE "InstagramAccount" ADD CONSTRAINT "InstagramAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramConversation" ADD CONSTRAINT "InstagramConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramConversation" ADD CONSTRAINT "InstagramConversation_accountId_tenantId_fkey" FOREIGN KEY ("accountId", "tenantId") REFERENCES "InstagramAccount"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMessage" ADD CONSTRAINT "InstagramMessage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMessage" ADD CONSTRAINT "InstagramMessage_accountId_tenantId_fkey" FOREIGN KEY ("accountId", "tenantId") REFERENCES "InstagramAccount"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramMessage" ADD CONSTRAINT "InstagramMessage_conversationId_tenantId_fkey" FOREIGN KEY ("conversationId", "tenantId") REFERENCES "InstagramConversation"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
