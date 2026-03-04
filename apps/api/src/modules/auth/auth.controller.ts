import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { AuthService } from './auth.service'
import { Public } from '@shared/decorators/current-user.decorator'
import { z } from 'zod'
import { registerSchema } from './dto/register.dto'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: unknown) {
    const { email, password } = loginSchema.parse(body)
    return this.authService.login(email, password)
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() body: unknown) {
    const dto = registerSchema.parse(body)
    return this.authService.register(dto)
  }
}
