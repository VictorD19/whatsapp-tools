import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { Roles } from '@shared/decorators/roles.decorator'
import { RoleGuard } from '@core/guards/role.guard'
import { AppException } from '@core/errors/app.exception'
import { CreateVoiceSchema } from './dto/create-voice.dto'
import { AssistantVoicesService } from './assistant-voices.service'

@UseGuards(RoleGuard)
@Roles('admin')
@Controller('assistants/voices')
export class AssistantVoicesController {
  constructor(private readonly service: AssistantVoicesService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.service.list(tenantId)
  }

  @Post()
  async create(
    @CurrentTenant() tenantId: string,
    @Req() req: FastifyRequest,
    @Query('name') nameQuery?: string,
  ) {
    const data = await (req as any).file()
    if (!data) {
      throw new AppException('AI_VOICE_SAMPLE_INVALID', 'Envie um arquivo de áudio como amostra')
    }

    const rawName = (nameQuery ?? data.fields?.name?.value ?? '').toString().trim()
    const parsed = CreateVoiceSchema.safeParse({ name: rawName })
    if (!parsed.success) {
      throw new AppException('VALIDATION_ERROR', 'Nome da voz é obrigatório (até 100 caracteres)')
    }

    const buffer = await data.toBuffer()

    return this.service.create(tenantId, parsed.data.name, {
      buffer,
      filename: (data.filename as string) || 'amostra',
      mimetype: (data.mimetype as string) || 'application/octet-stream',
    })
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.remove(tenantId, id)
  }
}
