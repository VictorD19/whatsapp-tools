-- CreateEnum
CREATE TYPE "ApiLogType" AS ENUM ('LLM_CHAT', 'EMBEDDING', 'TOOL_EXECUTION', 'TTS', 'STT');

-- CreateEnum
CREATE TYPE "ApiLogStatus" AS ENUM ('SUCCESS', 'ERROR');

-- CreateTable
CREATE TABLE "ApiLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ApiLogType" NOT NULL,
    "status" "ApiLogStatus" NOT NULL DEFAULT 'SUCCESS',
    "conversationId" TEXT,
    "assistantId" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "toolType" TEXT,
    "toolName" TEXT,
    "inputSummary" TEXT,
    "outputSummary" TEXT,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ApiLog_tenantId_idx" ON "ApiLog"("tenantId");

-- CreateIndex
CREATE INDEX "ApiLog_tenantId_createdAt_idx" ON "ApiLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ApiLog_tenantId_type_idx" ON "ApiLog"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ApiLog_conversationId_idx" ON "ApiLog"("conversationId");

-- AddForeignKey
ALTER TABLE "ApiLog" ADD CONSTRAINT "ApiLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
