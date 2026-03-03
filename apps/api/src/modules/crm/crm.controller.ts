import { Controller } from '@nestjs/common'
import { CrmService } from './crm.service'

// TODO: implement endpoints
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}
}
