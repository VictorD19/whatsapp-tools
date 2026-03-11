import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Put,
  Query,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Public } from '@shared/decorators/current-user.decorator'
import { NotificationsService } from './notifications.service'
import { NotificationFiltersSchema } from './dto/notification-filters.dto'
import { UpdatePreferenceSchema } from './dto/update-preference.dto'
import { NotificationType } from '@prisma/client'
import { AppException } from '@core/errors/app.exception'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(@Req() req: { user: { id: string } }, @Query() query: Record<string, string>) {
    const parsed = NotificationFiltersSchema.parse(query)
    return this.service.findByUser(req.user.id, parsed)
  }

  @Get('unread-count')
  getUnreadCount(@Req() req: { user: { id: string } }) {
    return this.service.getUnreadCount(req.user.id)
  }

  @Get('preferences')
  getPreferences(@Req() req: { user: { id: string } }) {
    return this.service.getPreferences(req.user.id)
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markAsRead(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.service.markAsRead(req.user.id, id)
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  markAllAsRead(@Req() req: { user: { id: string } }) {
    return this.service.markAllAsRead(req.user.id)
  }

  @Public()
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return this.service.getVapidPublicKey()
  }

  @Post('push-subscription')
  @HttpCode(HttpStatus.OK)
  savePushSubscription(
    @Req() req: { user: { id: string } },
    @Body() body: unknown,
  ) {
    const dto = body as { endpoint: string; keys: { p256dh: string; auth: string }; userAgent?: string }
    return this.service.savePushSubscription(req.user.id, dto)
  }

  @Delete('push-subscription')
  @HttpCode(HttpStatus.OK)
  removePushSubscription(
    @Req() req: { user: { id: string } },
    @Body() body: unknown,
  ) {
    const { endpoint } = body as { endpoint: string }
    return this.service.removePushSubscription(req.user.id, endpoint)
  }

  @Put('preferences/:type')
  updatePreference(
    @Req() req: { user: { id: string } },
    @Param('type') type: string,
    @Body() body: unknown,
  ) {
    if (!Object.values(NotificationType).includes(type as NotificationType)) {
      throw new AppException('VALIDATION_ERROR', 'Tipo de notificação inválido', { type })
    }
    const dto = UpdatePreferenceSchema.parse(body)
    return this.service.updatePreference(req.user.id, type as NotificationType, dto)
  }
}
