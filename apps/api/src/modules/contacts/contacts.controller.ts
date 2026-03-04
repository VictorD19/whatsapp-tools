import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ContactsService } from './contacts.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { contactFiltersSchema, ContactFiltersDto } from './dto/contact-filters.dto'
import { createContactSchema, CreateContactDto } from './dto/create-contact.dto'
import { updateContactSchema, UpdateContactDto } from './dto/update-contact.dto'

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findMany(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(contactFiltersSchema)) filters: ContactFiltersDto,
  ) {
    return this.contactsService.findMany(tenantId, filters)
  }

  @Get(':id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.findById(tenantId, id)
  }

  @Post()
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createContactSchema)) dto: CreateContactDto,
  ) {
    return this.contactsService.create(tenantId, dto)
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateContactSchema)) dto: UpdateContactDto,
  ) {
    return this.contactsService.update(tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.contactsService.remove(tenantId, id)
  }
}
