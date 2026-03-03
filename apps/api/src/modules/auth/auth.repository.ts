import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

// TODO: implement queries
@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}
}
