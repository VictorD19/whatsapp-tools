import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

// TODO: implement queries
@Injectable()
export class BroadcastsRepository {
  constructor(private readonly prisma: PrismaService) {}
}
