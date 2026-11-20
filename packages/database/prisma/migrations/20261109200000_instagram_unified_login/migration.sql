-- Additive change only to the Instagram pilot table. No WhatsApp data is touched.
ALTER TABLE "InstagramAccount" ADD COLUMN "clientBusinessId" TEXT;
