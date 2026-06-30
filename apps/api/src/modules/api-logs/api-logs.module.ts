import { Module } from '@nestjs/common'
import { ApiLogsController } from './api-logs.controller'
import { ApiLogsService } from './api-logs.service'
import { ApiLogsRepository } from './api-logs.repository'

@Module({
  controllers: [ApiLogsController],
  providers: [ApiLogsService, ApiLogsRepository],
  exports: [ApiLogsService],
})
export class ApiLogsModule {}
