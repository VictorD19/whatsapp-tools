import { Controller } from '@nestjs/common'
import { BroadcastsService } from './broadcasts.service'

// TODO: implement endpoints
@Controller('broadcasts')
export class BroadcastsController {
  constructor(private readonly broadcastsService: BroadcastsService) {}
}
