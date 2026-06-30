import { Injectable } from '@nestjs/common'
import type { ApiLogType } from '@prisma/client'
import { ApiLogsRepository, type CreateApiLogDto } from './api-logs.repository'

export interface RecordApiLogDto extends CreateApiLogDto {}

export interface ListApiLogsDto {
  type?: ApiLogType
  page?: number
  limit?: number
}

@Injectable()
export class ApiLogsService {
  constructor(private readonly repository: ApiLogsRepository) {}

  async record(dto: RecordApiLogDto) {
    return this.repository.create(dto)
  }

  async findAll(tenantId: string, dto: ListApiLogsDto) {
    return this.repository.findMany({
      tenantId,
      type: dto.type,
      page: dto.page ?? 1,
      limit: Math.min(dto.limit ?? 50, 200),
    })
  }
}
