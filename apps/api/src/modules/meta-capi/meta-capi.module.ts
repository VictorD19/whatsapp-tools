import { Module } from '@nestjs/common'
import { MetaCapiController } from './meta-capi.controller'
import { MetaCapiService } from './meta-capi.service'
import { MetaCapiRepository } from './meta-capi.repository'
import { MetaGraphAdapter } from './adapters/meta-graph/meta-graph.adapter'
import { META_CAPI_PROVIDER } from './meta-capi.tokens'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'

@Module({
  controllers: [MetaCapiController],
  providers: [
    {
      provide: META_CAPI_PROVIDER,
      useClass: MetaGraphAdapter,
    },
    MetaCapiService,
    MetaCapiRepository,
    AesCryptoService,
  ],
  exports: [MetaCapiService],
})
export class MetaCapiModule {}
