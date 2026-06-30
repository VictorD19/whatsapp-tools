import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { ApiLogType, ApiLogStatus } from '@prisma/client'

export interface CreateApiLogDto {
  tenantId: string
  type: ApiLogType
  status?: ApiLogStatus
  conversationId?: string
  assistantId?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  toolType?: string
  toolName?: string
  inputSummary?: string
  outputSummary?: string
  errorMessage?: string
  durationMs?: number
}

export interface FindApiLogsOptions {
  tenantId: string
  type?: ApiLogType
  page?: number
  limit?: number
}

@Injectable()
export class ApiLogsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateApiLogDto) {
    return this.prisma.apiLog.create({ data })
  }

  async findMany(opts: FindApiLogsOptions) {
    const { tenantId, type, page = 1, limit = 50 } = opts
    const skip = (page - 1) * limit

    const where = { tenantId, ...(type ? { type } : {}) }

    const [items, total] = await Promise.all([
      this.prisma.apiLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiLog.count({ where }),
    ])

    return { items, total, page, limit }
  }
}
