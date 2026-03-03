import { Module } from '@nestjs/common'
import { CoreModule } from './core/core.module'

// TODO: importar módulos de negócio conforme forem implementados
// import { AuthModule } from './modules/auth/auth.module'
// import { TenantsModule } from './modules/tenants/tenants.module'
// import { UsersModule } from './modules/users/users.module'
// import { InstancesModule } from './modules/instances/instances.module'
// import { BroadcastsModule } from './modules/broadcasts/broadcasts.module'
// import { GroupsModule } from './modules/groups/groups.module'
// import { AssistantsModule } from './modules/assistants/assistants.module'
// import { InboxModule } from './modules/inbox/inbox.module'
// import { CrmModule } from './modules/crm/crm.module'
// import { ContactsModule } from './modules/contacts/contacts.module'

@Module({
  imports: [
    CoreModule,
    // AuthModule,
    // TenantsModule,
    // UsersModule,
    // InstancesModule,
    // BroadcastsModule,
    // GroupsModule,
    // AssistantsModule,
    // InboxModule,
    // CrmModule,
    // ContactsModule,
  ],
})
export class AppModule {}
