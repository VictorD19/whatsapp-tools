import { Module } from '@nestjs/common'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'
import { InstagramConfig } from './instagram.config'
import { InstagramAdapter } from './instagram.adapter'
import { InstagramService } from './instagram.service'
import { InstagramController } from './instagram.controller'

@Module({ controllers: [InstagramController], providers: [InstagramConfig, InstagramAdapter, InstagramService, AesCryptoService] })
export class InstagramModule {}
