import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common'
import { AiToolsService } from './ai-tools.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { Roles } from '@shared/decorators/roles.decorator'
import { RoleGuard } from '@core/guards/role.guard'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createAiToolSchema, CreateAiToolDto } from './dto/create-ai-tool.dto'
import { updateAiToolSchema, UpdateAiToolDto } from './dto/update-ai-tool.dto'

@UseGuards(RoleGuard)
@Roles('admin')
@Controller()
export class AiToolsController {
  constructor(private readonly aiToolsService: AiToolsService) {}

  @Get('ai-tools')
  findAll(@CurrentTenant() tenantId: string) {
    return this.aiToolsService.findAll(tenantId)
  }

  @Get('ai-tools/:id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.aiToolsService.findById(tenantId, id)
  }

  @Post('ai-tools')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createAiToolSchema)) dto: CreateAiToolDto,
  ) {
    return this.aiToolsService.create(tenantId, dto)
  }

  @Patch('ai-tools/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAiToolSchema)) dto: UpdateAiToolDto,
  ) {
    return this.aiToolsService.update(tenantId, id, dto)
  }

  @Delete('ai-tools/:id')
  @HttpCode(HttpStatus.OK)
  delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.aiToolsService.delete(tenantId, id)
  }
}
