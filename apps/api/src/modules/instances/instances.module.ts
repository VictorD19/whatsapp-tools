import { Module } from '@nestjs/common'
import { InstancesController } from './instances.controller'
import { InstancesService } from './instances.service'
import { InstancesRepository } from './instances.repository'

@Module({
  controllers: [InstancesController],
  providers: [InstancesService, InstancesRepository],
  exports: [InstancesService],
})
export class InstancesModule {}
