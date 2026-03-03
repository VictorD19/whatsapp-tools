import { Controller } from '@nestjs/common'
import { ContactsService } from './contacts.service'

// TODO: implement endpoints
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}
}
