-- AlterTable
ALTER TABLE "CalendarEvent" ADD COLUMN "assistantId" TEXT;

-- CreateIndex
CREATE INDEX "CalendarEvent_assistantId_idx" ON "CalendarEvent"("assistantId");

-- AddForeignKey
ALTER TABLE "CalendarEvent" ADD CONSTRAINT "CalendarEvent_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Assistant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
