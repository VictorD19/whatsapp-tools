import { Module } from '@nestjs/common'
import { MetaCapiModule } from '@modules/meta-capi/meta-capi.module'
import { ContactsController } from './contacts.controller'
import { ContactsService } from './contacts.service'
import { ContactsRepository } from './contacts.repository'

@Module({
  imports: [MetaCapiModule],
  controllers: [ContactsController],
  providers: [ContactsService, ContactsRepository],
  exports: [ContactsService],
})
export class ContactsModule {}
