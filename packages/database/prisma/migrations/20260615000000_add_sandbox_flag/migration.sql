-- AlterTable
ALTER TABLE "Contact" ADD COLUMN "isSandbox" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "isSandbox" BOOLEAN NOT NULL DEFAULT false;
