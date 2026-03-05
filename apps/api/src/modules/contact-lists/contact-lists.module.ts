import { Module } from '@nestjs/common'
import { ContactListsController } from './contact-lists.controller'
import { ContactListsService } from './contact-lists.service'
import { ContactListsRepository } from './contact-lists.repository'

@Module({
  controllers: [ContactListsController],
  providers: [ContactListsService, ContactListsRepository],
  exports: [ContactListsService],
})
export class ContactListsModule {}
