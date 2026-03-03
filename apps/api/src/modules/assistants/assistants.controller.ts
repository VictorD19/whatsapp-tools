import { Controller } from '@nestjs/common'
import { AssistantsService } from './assistants.service'

// TODO: implement endpoints
@Controller('assistants')
export class AssistantsController {
  constructor(private readonly assistantsService: AssistantsService) {}
}
