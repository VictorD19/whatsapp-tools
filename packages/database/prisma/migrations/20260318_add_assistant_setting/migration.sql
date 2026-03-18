-- CreateTable
CREATE TABLE "AssistantSetting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "openaiApiKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssistantSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AssistantSetting_tenantId_key" ON "AssistantSetting"("tenantId");

-- CreateIndex
CREATE INDEX "AssistantSetting_tenantId_idx" ON "AssistantSetting"("tenantId");

-- AddForeignKey
ALTER TABLE "AssistantSetting" ADD CONSTRAINT "AssistantSetting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
