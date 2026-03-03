import { Controller } from '@nestjs/common'
import { GroupsService } from './groups.service'

// TODO: implement endpoints
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}
}
