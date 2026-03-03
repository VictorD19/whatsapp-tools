import { Module } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'
import { EvolutionAdapter } from './adapters/evolution/evolution.adapter'
import { EvolutionHttpClient } from './adapters/evolution/evolution-http.client'

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER'

@Module({
  providers: [
    EvolutionHttpClient,
    {
      provide: WHATSAPP_PROVIDER,
      useClass: EvolutionAdapter, // ← trocar aqui para mudar de provider
    },
    WhatsAppService,
  ],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
