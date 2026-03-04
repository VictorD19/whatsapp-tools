import { Module } from '@nestjs/common'
import { TenantsController } from './tenants.controller'
import { AdminTenantsController } from './admin-tenants.controller'
import { TenantsService } from './tenants.service'
import { TenantsRepository } from './tenants.repository'
import { PipelineModule } from '@modules/pipeline/pipeline.module'
import { TagModule } from '@modules/tag/tag.module'
import { PlanModule } from '@modules/plan/plan.module'

@Module({
  imports: [PipelineModule, TagModule, PlanModule],
  controllers: [TenantsController, AdminTenantsController],
  providers: [TenantsService, TenantsRepository],
  exports: [TenantsService],
})
export class TenantsModule {}
