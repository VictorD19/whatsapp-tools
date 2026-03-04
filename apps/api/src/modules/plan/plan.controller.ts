import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { PlanService } from './plan.service'
import { SuperAdmin } from '@shared/decorators/super-admin.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createPlanSchema, CreatePlanDto } from './dto/create-plan.dto'
import { updatePlanSchema, UpdatePlanDto } from './dto/update-plan.dto'
import { planFiltersSchema, PlanFiltersDto } from './dto/plan-filters.dto'

@Controller('admin/plans')
@SuperAdmin()
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(planFiltersSchema)) filters: PlanFiltersDto,
  ) {
    return this.planService.findAll(filters)
  }

  @Get('active')
  findActive() {
    return this.planService.findActive()
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.planService.findById(id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createPlanSchema)) dto: CreatePlanDto,
  ) {
    return this.planService.create(dto)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updatePlanSchema)) dto: UpdatePlanDto,
  ) {
    return this.planService.update(id, dto)
  }
}
