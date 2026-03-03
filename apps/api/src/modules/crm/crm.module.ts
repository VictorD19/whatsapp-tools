import { Module } from '@nestjs/common'
import { CrmController } from './crm.controller'
import { CrmService } from './crm.service'
import { CrmRepository } from './crm.repository'

@Module({
  controllers: [CrmController],
  providers: [CrmService, CrmRepository],
  exports: [CrmService],
})
export class CrmModule {}
