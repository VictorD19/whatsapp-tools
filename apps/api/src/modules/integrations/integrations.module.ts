import { Module } from '@nestjs/common'
import { IntegrationsService } from './integrations.service'
import { IntegrationsRepository } from './integrations.repository'
import { GoogleAuthService } from './adapters/google/google-auth.service'
import { GoogleCalendarAdapter } from './adapters/google/google-calendar.adapter'
import { CALENDAR_PROVIDER } from './integrations.tokens'

@Module({
  providers: [
    {
      provide: CALENDAR_PROVIDER,
      useClass: GoogleCalendarAdapter,
    },
    GoogleAuthService,
    IntegrationsService,
    IntegrationsRepository,
  ],
  exports: [IntegrationsService, CALENDAR_PROVIDER],
})
export class IntegrationsModule {}
