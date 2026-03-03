import { Controller } from '@nestjs/common'
import { InstancesService } from './instances.service'

// TODO: implement endpoints
@Controller('instances')
export class InstancesController {
  constructor(private readonly instancesService: InstancesService) {}
}
