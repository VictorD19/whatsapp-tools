import { Controller } from '@nestjs/common'
import { InboxService } from './inbox.service'

// TODO: implement endpoints
@Controller('inbox')
export class InboxController {
  constructor(private readonly inboxService: InboxService) {}
}
