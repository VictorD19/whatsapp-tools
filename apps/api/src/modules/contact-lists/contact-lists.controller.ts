import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
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
