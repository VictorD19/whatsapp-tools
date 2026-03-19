-- AlterTable
ALTER TABLE "Assistant" ADD COLUMN "audioResponseMode" TEXT NOT NULL DEFAULT 'never';
ALTER TABLE "Assistant" ADD COLUMN "voiceId" TEXT NOT NULL DEFAULT 'pt-BR-FranciscaNeural';
