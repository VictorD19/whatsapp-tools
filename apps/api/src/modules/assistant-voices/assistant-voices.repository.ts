import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

interface CreateVoiceData {
  tenantId: string
  name: string
  externalVoiceId: string
  provider?: string
}

@Injectable()
export class AssistantVoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(tenantId: string) {
    return this.prisma.assistantVoice.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.assistantVoice.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  create(data: CreateVoiceData) {
    return this.prisma.assistantVoice.create({
      data: {
        name: data.name,
        externalVoiceId: data.externalVoiceId,
        provider: data.provider ?? 'elevenlabs',
        tenant: { connect: { id: data.tenantId } },
      },
    })
  }

  setPreviewKey(id: string, previewKey: string) {
    return this.prisma.assistantVoice.update({
      where: { id },
      data: { previewKey },
    })
  }

  softDelete(tenantId: string, id: string) {
    return this.prisma.assistantVoice.updateMany({
      where: { id, tenantId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }
}
