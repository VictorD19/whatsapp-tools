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
import { DealService } from './deal.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createDealSchema, CreateDealDto } from './dto/create-deal.dto'
import { updateDealSchema, UpdateDealDto } from './dto/update-deal.dto'
import { moveDealSchema, MoveDealDto } from './dto/move-deal.dto'
import { createDealNoteSchema, CreateDealNoteDto } from './dto/create-deal-note.dto'
import { dealFiltersSchema, DealFiltersDto } from './dto/deal-filters.dto'

@Controller('deals')
export class DealController {
  constructor(private readonly dealService: DealService) {}

  @Get()
  findDeals(
    @CurrentTenant() tenantId: string,
    @Query(new ZodValidationPipe(dealFiltersSchema)) filters: DealFiltersDto,
  ) {
    return this.dealService.findDeals(tenantId, filters)
  }

  @Get(':id')
  findDealById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.dealService.findDealById(tenantId, id)
  }

  @Post()
  createDeal(
    @CurrentTenant() tenantId: string,
    @Body(new ZodValidationPipe(createDealSchema)) dto: CreateDealDto,
  ) {
    return this.dealService.createDeal(tenantId, dto)
  }

  @Patch(':id')
  updateDeal(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateDealSchema)) dto: UpdateDealDto,
  ) {
    return this.dealService.updateDeal(tenantId, id, dto)
  }

  @Patch(':id/move')
  moveDeal(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moveDealSchema)) dto: MoveDealDto,
  ) {
    return this.dealService.moveDeal(tenantId, id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  deleteDeal(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.dealService.deleteDeal(tenantId, id)
  }

  @Get(':id/notes')
  findNotes(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.dealService.findNotes(tenantId, id)
  }

  @Post(':id/notes')
  createNote(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(createDealNoteSchema)) dto: CreateDealNoteDto,
  ) {
    return this.dealService.createNote(tenantId, id, user.id, dto)
  }
}
