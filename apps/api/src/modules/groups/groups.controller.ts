import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { extractContactsSchema, ExtractContactsDto } from './dto/extract-contacts.dto'

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get('instances/:instanceId')
  getGroups(
    @CurrentTenant() tenantId: string,
    @Param('instanceId') instanceId: string,
  ) {
    return this.groupsService.getGroups(tenantId, instanceId)
  }

  @Get('instances/:instanceId/:groupId/members')
  getGroupMembers(
    @CurrentTenant() tenantId: string,
    @Param('instanceId') instanceId: string,
    @Param('groupId') groupId: string,
  ) {
    return this.groupsService.getGroupMembers(tenantId, instanceId, groupId)
  }

  @Post('extract-contacts')
  extractContacts(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(extractContactsSchema)) dto: ExtractContactsDto,
  ) {
    return this.groupsService.extractContacts(tenantId, dto)
  }
}
