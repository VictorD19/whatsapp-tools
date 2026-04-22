import { Module } from '@nestjs/common'
import { CoreModule } from './core/core.module'
import { AuthModule } from './modules/auth/auth.module'
import { InstancesModule } from './modules/instances/instances.module'
import { ContactsModule } from './modules/contacts/contacts.module'
import { InboxModule } from './modules/inbox/inbox.module'
import { PipelineModule } from './modules/pipeline/pipeline.module'
import { TagModule } from './modules/tag/tag.module'
import { PlanModule } from './modules/plan/plan.module'

import { TenantsModule } from './modules/tenants/tenants.module'
import { DealModule } from './modules/deal/deal.module'
// TODO: importar módulos de negócio conforme forem implementados
import { UsersModule } from './modules/users/users.module'
import { GroupsModule } from './modules/groups/groups.module'
import { ContactListsModule } from './modules/contact-lists/contact-lists.module'
import { NotificationsModule } from './modules/notifications/notifications.module'
import { BroadcastsModule } from './modules/broadcasts/broadcasts.module'
import { AiToolsModule } from './modules/ai-tools/ai-tools.module'
import { AssistantsModule } from './modules/assistants/assistants.module'
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module'
import { FollowUpModule } from './modules/follow-up/follow-up.module'
import { IntegrationsModule } from './modules/integrations/integrations.module'
import { HealthModule } from './modules/health/health.module'
import { InactivityScannerModule } from './modules/inactivity-scanner/inactivity-scanner.module'
// import { CrmModule } from './modules/crm/crm.module'

@Module({
  imports: [
    CoreModule,
    AuthModule,
    PlanModule,
    InstancesModule,
    ContactsModule,
    InboxModule,
    PipelineModule,
    TagModule,
    TenantsModule,
    DealModule,
    UsersModule,
    GroupsModule,
    ContactListsModule,
    NotificationsModule,
    BroadcastsModule,
    AiToolsModule,
    AssistantsModule,
    KnowledgeBaseModule,
    FollowUpModule,
    IntegrationsModule,
    HealthModule,
    InactivityScannerModule,
    // CrmModule,
  ],
})
export class AppModule { }
