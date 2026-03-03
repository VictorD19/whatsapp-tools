import { Module } from '@nestjs/common'
import { WhatsAppService } from './whatsapp.service'
import { EvolutionAdapter } from './adapters/evolution/evolution.adapter'
import { EvolutionHttpClient } from './adapters/evolution/evolution-http.client'
import { WHATSAPP_PROVIDER } from './whatsapp.tokens'

export { WHATSAPP_PROVIDER }

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
