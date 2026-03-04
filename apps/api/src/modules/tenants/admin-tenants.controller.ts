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
import { TenantsService } from './tenants.service'
import { SuperAdmin } from '@shared/decorators/super-admin.decorator'
import { ZodValidationPipe } from '@shared/pipes/zod-validation.pipe'
import { createTenantSchema, CreateTenantDto } from './dto/create-tenant.dto'
import { updateTenantSchema, UpdateTenantDto } from './dto/update-tenant.dto'
import { tenantFiltersSchema, TenantFiltersDto } from './dto/tenant-filters.dto'

@Controller('admin/tenants')
@SuperAdmin()
export class AdminTenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get()
  findAll(
    @Query(new ZodValidationPipe(tenantFiltersSchema)) filters: TenantFiltersDto,
  ) {
    return this.tenantsService.findAll(filters)
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.tenantsService.findById(id)
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body(new ZodValidationPipe(createTenantSchema)) dto: CreateTenantDto,
  ) {
    return this.tenantsService.create(dto)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) dto: UpdateTenantDto,
  ) {
    return this.tenantsService.update(id, dto)
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id)
  }
}
