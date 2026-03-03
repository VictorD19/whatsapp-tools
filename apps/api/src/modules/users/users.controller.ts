import { Controller } from '@nestjs/common'
import { UsersService } from './users.service'

// TODO: implement endpoints
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
}
