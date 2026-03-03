import { Controller } from '@nestjs/common'
import { AuthService } from './auth.service'

// TODO: implement endpoints
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
}
