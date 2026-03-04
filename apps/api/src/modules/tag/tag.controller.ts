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
} from '@nestjs/common'
import { TagService } from './tag.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createTagSchema, CreateTagDto } from './dto/create-tag.dto'
import { updateTagSchema, UpdateTagDto } from './dto/update-tag.dto'
import { addContactTagSchema, AddContactTagDto } from './dto/add-contact-tag.dto'

@Controller()
export class TagController {
  constructor(private readonly tagService: TagService) {}

  // ── Tag CRUD ──

  @Get('tags')
  findAll(@CurrentTenant() tenantId: string) {
    return this.tagService.findAll(tenantId)
  }

  @Post('tags')
  create(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createTagSchema)) dto: CreateTagDto,
  ) {
    return this.tagService.create(tenantId, dto)
  }

  @Patch('tags/:id')
  update(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTagSchema)) dto: UpdateTagDto,
  ) {
    return this.tagService.update(tenantId, id, dto)
  }

  @Delete('tags/:id')
  @HttpCode(HttpStatus.OK)
  delete(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.tagService.delete(tenantId, id)
  }

  // ── ContactTag ──

  @Get('contacts/:id/tags')
  findContactTags(
    @CurrentTenant() tenantId: string,
    @Param('id') contactId: string,
  ) {
    return this.tagService.findContactTags(tenantId, contactId)
  }

  @Post('contacts/:id/tags')
  addContactTag(
    @CurrentTenant() tenantId: string,
    @Param('id') contactId: string,
    @Body(new ZodValidationPipe(addContactTagSchema)) dto: AddContactTagDto,
  ) {
    return this.tagService.addContactTag(tenantId, contactId, dto.tagId)
  }

  @Delete('contacts/:id/tags/:tagId')
  @HttpCode(HttpStatus.OK)
  removeContactTag(
    @CurrentTenant() tenantId: string,
    @Param('id') contactId: string,
    @Param('tagId') tagId: string,
  ) {
    return this.tagService.removeContactTag(tenantId, contactId, tagId)
  }
}
