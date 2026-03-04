import { Module } from '@nestjs/common'
import { CoreModule } from './core/core.module'
import { AuthModule } from './modules/auth/auth.module'
import { InstancesModule } from './modules/instances/instances.module'
import { ContactsModule } from './modules/contacts/contacts.module'
import { InboxModule } from './modules/inbox/inbox.module'

import { TenantsModule } from './modules/tenants/tenants.module'
// TODO: importar módulos de negócio conforme forem implementados
// import { UsersModule } from './modules/users/users.module'
// import { BroadcastsModule } from './modules/broadcasts/broadcasts.module'
// import { GroupsModule } from './modules/groups/groups.module'
// import { AssistantsModule } from './modules/assistants/assistants.module'
// import { CrmModule } from './modules/crm/crm.module'

@Module({
  imports: [
    CoreModule,
    AuthModule,
    InstancesModule,
    ContactsModule,
    InboxModule,
    TenantsModule,
    // UsersModule,
    // BroadcastsModule,
    // GroupsModule,
    // AssistantsModule,
    // CrmModule,
  ],
})
export class AppModule {}
