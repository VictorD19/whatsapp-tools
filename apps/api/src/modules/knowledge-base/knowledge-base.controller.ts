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
  Req,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { KnowledgeBaseService } from './knowledge-base.service'
import { CreateKnowledgeBaseSchema, type CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto'
import { UpdateKnowledgeBaseSchema, type UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto'
import { AddSourceSchema, type AddSourceDto } from './dto/add-source.dto'

@Controller('knowledge-bases')
export class KnowledgeBaseController {
  constructor(private readonly service: KnowledgeBaseService) {}

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.service.findAll(tenantId)
  }

  @Get(':id')
  findById(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.findById(tenantId, id)
  }

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(CreateKnowledgeBaseSchema)) dto: CreateKnowledgeBaseDto,
  ) {
    return this.service.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateKnowledgeBaseSchema)) dto: UpdateKnowledgeBaseDto,
  ) {
    return this.service.update(tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  delete(@CurrentTenant() tenantId: string, @Param('id') id: string) {
    return this.service.delete(tenantId, id)
  }

  @Post(':id/sources/file')
  async addFileSource(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Req() req: FastifyRequest,
  ) {
    const data = await (req as any).file()
    const buffer = await data.toBuffer()

    return this.service.addFileSource(tenantId, id, {
      buffer,
      mimetype: data.mimetype as string,
      filename: (data.filename as string) || 'arquivo',
    })
  }

  @Post(':id/sources/url')
  addUrlSource(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddSourceSchema)) dto: AddSourceDto,
  ) {
    return this.service.addUrlSource(tenantId, id, dto)
  }

  @Post(':id/sources/text')
  addTextSource(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(AddSourceSchema)) dto: AddSourceDto,
  ) {
    return this.service.addTextSource(tenantId, id, dto)
  }

  @Delete(':id/sources/:sourceId')
  @HttpCode(HttpStatus.OK)
  deleteSource(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.service.deleteSource(tenantId, id, sourceId)
  }

  @Post(':id/sources/:sourceId/reingest')
  @HttpCode(HttpStatus.OK)
  reIngestSource(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Param('sourceId') sourceId: string,
  ) {
    return this.service.reIngestSource(tenantId, id, sourceId)
  }
}
