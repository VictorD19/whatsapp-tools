import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { FollowUpService } from './follow-up.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createFollowUpSchema, CreateFollowUpDto } from './dto/create-follow-up.dto'
import { followUpFiltersSchema, FollowUpFiltersDto } from './dto/follow-up-filters.dto'

@Controller()
export class FollowUpController {
  constructor(private readonly followUpService: FollowUpService) {}

  @Post('conversations/:id/follow-ups')
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { id: string },
    @Param('id') conversationId: string,
    @Body(new ZodValidationPipe(createFollowUpSchema)) dto: CreateFollowUpDto,
  ) {
    return this.followUpService.create(tenantId, conversationId, user.id, dto)
  }

  @Get('conversations/:id/follow-ups')
  findByConversation(
    @CurrentTenant() tenantId: string,
    @Param('id') conversationId: string,
    @Query(new ZodValidationPipe(followUpFiltersSchema)) filters: FollowUpFiltersDto,
  ) {
    return this.followUpService.findByConversation(tenantId, conversationId, filters)
  }

  @Delete('follow-ups/:id')
  @HttpCode(HttpStatus.OK)
  cancel(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.followUpService.cancel(tenantId, id)
  }
}
