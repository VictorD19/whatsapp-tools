-- CreateTable
CREATE TABLE "AssistantVoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'elevenlabs',
    "externalVoiceId" TEXT NOT NULL,
    "previewKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "AssistantVoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssistantVoice_tenantId_idx" ON "AssistantVoice"("tenantId");

-- AddForeignKey
ALTER TABLE "AssistantVoice" ADD CONSTRAINT "AssistantVoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
