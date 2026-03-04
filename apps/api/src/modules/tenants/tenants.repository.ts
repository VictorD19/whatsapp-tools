import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class TenantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
    })
  }

  async getNextProtocol(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { protocolSeq: { increment: 1 } },
      select: { protocolPrefix: true, protocolSeq: true },
    })

    return `${tenant.protocolPrefix}${tenant.protocolSeq}`
  }

  async updateProtocolPrefix(tenantId: string, prefix: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { protocolPrefix: prefix },
      select: { protocolPrefix: true },
    })
  }

  async getProtocolSettings(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { protocolPrefix: true, protocolSeq: true },
    })
  }
}
