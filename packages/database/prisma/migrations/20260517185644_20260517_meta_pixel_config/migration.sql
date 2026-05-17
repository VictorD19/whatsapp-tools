-- CreateTable
CREATE TABLE "MetaPixelConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "pixelId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "eventRules" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MetaPixelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaPixelConfig_tenantId_key" ON "MetaPixelConfig"("tenantId");

-- CreateIndex
CREATE INDEX "MetaPixelConfig_tenantId_idx" ON "MetaPixelConfig"("tenantId");

-- AddForeignKey
ALTER TABLE "MetaPixelConfig" ADD CONSTRAINT "MetaPixelConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
