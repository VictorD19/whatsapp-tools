import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import { Response } from 'express'
import { ContactListsService } from './contact-lists.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createContactListSchema, CreateContactListDto } from './dto/create-contact-list.dto'
import { contactListFiltersSchema, ContactListFiltersDto } from './dto/contact-list-filters.dto'
import { exportContactsSchema, ExportContactsDto } from './dto/export-contacts.dto'

@Controller('contact-lists')
export class ContactListsController {
  constructor(private readonly service: ContactListsService) {}

  @Get()
  findMany(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(contactListFiltersSchema)) filters: ContactListFiltersDto,
  ) {
    return this.service.findMany(tenantId, filters)
  }

  @Get(':id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.findById(tenantId, id)
  }

  @Post('import-csv')
  async importCsv(
    @CurrentTenant() tenantId: string,
    @Req() req: FastifyRequest,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts = (req as any).parts()
    let fileBuffer: Buffer | null = null
    let name = ''
    let description: string | undefined

    for await (const part of parts) {
      if (part.type === 'file') {
        fileBuffer = await part.toBuffer()
      } else if (part.fieldname === 'name') {
        name = part.value as string
      } else if (part.fieldname === 'description') {
        description = part.value as string
      }
    }

    if (!fileBuffer) {
      throw new BadRequestException('Nenhum arquivo CSV enviado')
    }
    if (!name?.trim()) {
      throw new BadRequestException('Nome da lista é obrigatório')
    }

    return this.service.importCsv(tenantId, name.trim(), fileBuffer, description?.trim())
  }

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createContactListSchema)) dto: CreateContactListDto,
  ) {
    return this.service.create(tenantId, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.service.remove(tenantId, id)
  }

  @Post('export')
  async exportContacts(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(exportContactsSchema)) dto: ExportContactsDto,
    @Res() res: Response,
  ) {
    const result = await this.service.exportContacts(tenantId, dto)

    res.setHeader('Content-Type', result.contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.content)
  }
}
