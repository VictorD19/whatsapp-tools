import { Controller } from '@nestjs/common'
import { BillingService } from './billing.service'

// TODO: implement endpoints
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}
}
