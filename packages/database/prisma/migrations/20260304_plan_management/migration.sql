-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "benefits" JSONB NOT NULL DEFAULT '[]',
    "maxInstances" INTEGER NOT NULL DEFAULT 3,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxAssistants" INTEGER NOT NULL DEFAULT 1,
    "maxBroadcastsPerDay" INTEGER NOT NULL DEFAULT 5,
    "maxContactsPerBroadcast" INTEGER NOT NULL DEFAULT 500,
    "price" DECIMAL(10,2),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");

-- CreateIndex
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");

-- CreateIndex
CREATE INDEX "Plan_sortOrder_idx" ON "Plan"("sortOrder");

-- Seed default plans
INSERT INTO "Plan" ("id", "name", "slug", "description", "benefits", "maxInstances", "maxUsers", "maxAssistants", "maxBroadcastsPerDay", "maxContactsPerBroadcast", "price", "isDefault", "isActive", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('plan_free', 'Free', 'free', 'Plano gratuito para comecar', '["3 instancias","5 usuarios","1 assistente","5 disparos/dia"]', 3, 5, 1, 5, 500, NULL, true, true, 0, NOW(), NOW()),
  ('plan_pro', 'Pro', 'pro', 'Plano profissional para equipes', '["10 instancias","20 usuarios","5 assistentes","50 disparos/dia","2000 contatos/disparo"]', 10, 20, 5, 50, 2000, 97.00, false, true, 1, NOW(), NOW()),
  ('plan_enterprise', 'Enterprise', 'enterprise', 'Plano empresarial sem limites', '["Instancias ilimitadas","Usuarios ilimitados","Assistentes ilimitados","Disparos ilimitados"]', 999, 999, 999, 999, 99999, 297.00, false, true, 2, NOW(), NOW());

-- Add planId column (nullable first)
ALTER TABLE "Tenant" ADD COLUMN "planId" TEXT;

-- Populate planId based on existing plan string
UPDATE "Tenant" SET "planId" = 'plan_free' WHERE "plan" = 'free';
UPDATE "Tenant" SET "planId" = 'plan_pro' WHERE "plan" = 'pro';
UPDATE "Tenant" SET "planId" = 'plan_enterprise' WHERE "plan" = 'enterprise';

-- Fallback: assign free plan to any tenant without a match
UPDATE "Tenant" SET "planId" = 'plan_free' WHERE "planId" IS NULL;

-- Make planId NOT NULL
ALTER TABLE "Tenant" ALTER COLUMN "planId" SET NOT NULL;

-- Drop old columns
ALTER TABLE "Tenant" DROP COLUMN "plan";
ALTER TABLE "Tenant" DROP COLUMN "maxInstances";

-- Add FK and index
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Tenant_planId_idx" ON "Tenant"("planId");
