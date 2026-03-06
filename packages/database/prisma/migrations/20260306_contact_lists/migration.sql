-- CreateEnum
CREATE TYPE "ContactListSource" AS ENUM ('GROUP_EXTRACT', 'CSV_IMPORT', 'MANUAL', 'CRM_FILTER');

-- CreateTable
CREATE TABLE "ContactList" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "ContactListSource" NOT NULL DEFAULT 'MANUAL',
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactListItem" (
    "contactListId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactListItem_pkey" PRIMARY KEY ("contactListId","contactId")
);

-- CreateIndex
CREATE INDEX "ContactList_tenantId_idx" ON "ContactList"("tenantId");

-- CreateIndex
CREATE INDEX "ContactListItem_contactId_idx" ON "ContactListItem"("contactId");

-- AddForeignKey
ALTER TABLE "ContactList" ADD CONSTRAINT "ContactList_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListItem" ADD CONSTRAINT "ContactListItem_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListItem" ADD CONSTRAINT "ContactListItem_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
