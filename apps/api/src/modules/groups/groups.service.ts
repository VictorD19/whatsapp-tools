import { Injectable } from '@nestjs/common'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InstancesService } from '@modules/instances/instances.service'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { GroupExtractProducer } from './queues/extract.producer'
import type { ExtractContactsDto } from './dto/extract-contacts.dto'

@Injectable()
export class GroupsService {
  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly instancesService: InstancesService,
    private readonly extractProducer: GroupExtractProducer,
    private readonly logger: LoggerService,
  ) {}

  async getGroups(tenantId: string, instanceId: string) {
    const instance = await this.instancesService.findOne(tenantId, instanceId)

    if (instance.status !== 'CONNECTED') {
      throw new AppException(
        'GROUP_EXTRACT_INSTANCE_NOT_CONNECTED',
        'A instância precisa estar conectada para listar grupos',
      )
    }

    const groups = await this.whatsapp.getGroups(instance.evolutionId)
    return { data: groups }
  }

  async getGroupMembers(tenantId: string, instanceId: string, groupId: string) {
    const instance = await this.instancesService.findOne(tenantId, instanceId)

    if (instance.status !== 'CONNECTED') {
      throw new AppException(
        'GROUP_EXTRACT_INSTANCE_NOT_CONNECTED',
        'A instância precisa estar conectada para listar membros',
      )
    }

    try {
      const members = await this.whatsapp.getGroupMembers(instance.evolutionId, groupId)
      return { data: members }
    } catch (error) {
      this.logger.error(
        `Failed to fetch group members: ${(error as Error).message}`,
        (error as Error).stack,
        'GroupsService',
      )
      throw new AppException(
        'GROUP_MEMBERS_FETCH_FAILED',
        'Falha ao buscar membros do grupo',
      )
    }
  }

  async extractContacts(tenantId: string, dto: ExtractContactsDto) {
    const instance = await this.instancesService.findOne(tenantId, dto.instanceId)

    if (instance.status !== 'CONNECTED') {
      throw new AppException(
        'GROUP_EXTRACT_INSTANCE_NOT_CONNECTED',
        'A instância precisa estar conectada para extrair contatos',
      )
    }

    const job = await this.extractProducer.startExtraction({
      tenantId,
      instanceId: dto.instanceId,
      evolutionId: instance.evolutionId,
      groupIds: dto.groupIds,
      createList: dto.createList,
    })

    this.logger.log(
      `Extraction job queued: ${job.id} for ${dto.groupIds.length} groups`,
      'GroupsService',
    )

    return {
      data: {
        jobId: job.id,
        message: 'Extração iniciada. Acompanhe o progresso em tempo real.',
      },
    }
  }
}
