-- AlterTable
ALTER TABLE "Message" ADD COLUMN "quotedMessageId" TEXT;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_quotedMessageId_fkey" FOREIGN KEY ("quotedMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
