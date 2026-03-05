import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { ContactsService } from '@modules/contacts/contacts.service'
import { InboxGateway } from '@modules/inbox/inbox.gateway'
import { PrismaService } from '@core/database/prisma.service'
import type { ExtractContactsJobData } from './extract.producer'

interface ExtractedContact {
  phone: string
  name?: string
  groupName: string
}

@Processor(QUEUES.GROUP_CONTACT_EXTRACT)
export class GroupExtractProcessor {
  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly contactsService: ContactsService,
    private readonly prisma: PrismaService,
    private readonly gateway: InboxGateway,
    private readonly logger: LoggerService,
  ) {}

  @Process({ name: 'extract-contacts', concurrency: 2 })
  async handleExtract(job: Job<ExtractContactsJobData>) {
    const { tenantId, evolutionId, groupIds, createList } = job.data

    this.logger.log(
      `Starting contact extraction for ${groupIds.length} groups`,
      'GroupExtractProcessor',
    )

    this.gateway.server
      .to(`tenant:${tenantId}`)
      .emit('extract:started', { groupCount: groupIds.length })

    const allContacts: ExtractedContact[] = []
    let processedGroups = 0

    // Fetch all groups ONCE to build a name lookup map
    const groupNameMap = new Map<string, string>()
    try {
      const groups = await this.whatsapp.getGroups(evolutionId)
      for (const g of groups) groupNameMap.set(g.id, g.name)
    } catch {
      this.logger.warn('Failed to fetch group names — using groupId as fallback', 'GroupExtractProcessor')
    }

    for (const groupId of groupIds) {
      try {
        // Rate-limit: wait 2s between groups to avoid WhatsApp 429
        if (processedGroups > 0) {
          await new Promise((r) => setTimeout(r, 2000))
        }

        const members = await this.whatsapp.getGroupMembers(evolutionId, groupId)
        const groupName = groupNameMap.get(groupId) ?? groupId

        for (const member of members) {
          const phone = member.phone || member.id.split('@')[0]
          // Only keep valid phone numbers (digits only)
          // Skips LIDs (lid.xxxxx), status JIDs, and other non-phone identifiers
          if (!phone || !/^\d+$/.test(phone)) continue

          allContacts.push({
            phone,
            name: member.name,
            groupName,
          })
        }

        processedGroups++
        this.gateway.server.to(`tenant:${tenantId}`).emit('extract:progress', {
          processed: processedGroups,
          total: groupIds.length,
          contactsSoFar: allContacts.length,
        })
      } catch (error) {
        this.logger.error(
          `Failed to extract members from group ${groupId}: ${(error as Error).message}`,
          (error as Error).stack,
          'GroupExtractProcessor',
        )
      }
    }

    // Deduplicate by phone
    const uniqueByPhone = new Map<string, ExtractedContact>()
    for (const c of allContacts) {
      if (!uniqueByPhone.has(c.phone)) {
        uniqueByPhone.set(c.phone, c)
      } else if (c.name && !uniqueByPhone.get(c.phone)!.name) {
        // Prefer entries that have a name
        uniqueByPhone.set(c.phone, c)
      }
    }
    const deduplicated = Array.from(uniqueByPhone.values())

    this.logger.log(
      `Extracted ${allContacts.length} contacts, ${deduplicated.length} unique after dedup`,
      'GroupExtractProcessor',
    )

    // Upsert contacts into database
    const upsertedContactIds: string[] = []
    for (const c of deduplicated) {
      try {
        const contact = await this.contactsService.findOrCreate(
          tenantId,
          c.phone,
          c.name,
        )
        upsertedContactIds.push(contact.id)
      } catch (error) {
        this.logger.error(
          `Failed to upsert contact ${c.phone}: ${(error as Error).message}`,
          undefined,
          'GroupExtractProcessor',
        )
      }
    }

    // Create contact list if requested
    let contactListId: string | undefined
    if (createList && upsertedContactIds.length > 0) {
      const list = await this.prisma.contactList.create({
        data: {
          tenantId,
          name: createList.name,
          description: createList.description,
          source: 'GROUP_EXTRACT',
          contactCount: upsertedContactIds.length,
          items: {
            createMany: {
              data: upsertedContactIds.map((contactId) => ({ contactId })),
              skipDuplicates: true,
            },
          },
        },
      })
      contactListId = list.id
    }

    this.gateway.server.to(`tenant:${tenantId}`).emit('extract:completed', {
      totalExtracted: deduplicated.length,
      totalSaved: upsertedContactIds.length,
      contactListId,
      contacts: deduplicated.map((c) => ({
        phone: c.phone,
        name: c.name,
        groupName: c.groupName,
      })),
    })

    this.logger.log(
      `Extraction completed: ${upsertedContactIds.length} contacts saved${contactListId ? `, list ${contactListId} created` : ''}`,
      'GroupExtractProcessor',
    )
  }
}
