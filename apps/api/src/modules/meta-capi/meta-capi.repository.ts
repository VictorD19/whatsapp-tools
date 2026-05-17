import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { EventRules } from './dto/upsert-meta-capi-config.dto'

@Injectable()
export class MetaCapiRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByTenant(tenantId: string) {
    return this.prisma.metaPixelConfig.findFirst({
      where: { tenantId, deletedAt: null },
    })
  }

  async upsert(
    tenantId: string,
    data: {
      pixelId: string
      accessToken: string
      isActive: boolean
      eventRules: EventRules
      testEventCode?: string | null
    },
  ) {
    const payload = { ...data, eventRules: data.eventRules as object }
    return this.prisma.metaPixelConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...payload },
      update: { ...payload, deletedAt: null },
    })
  }

  softDelete(tenantId: string) {
    return this.prisma.metaPixelConfig.updateMany({
      where: { tenantId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    })
  }
}
