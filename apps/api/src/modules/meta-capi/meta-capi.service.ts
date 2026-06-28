import { Inject, Injectable, Logger } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'
import { META_CAPI_PROVIDER } from './meta-capi.tokens'
import { MetaCapiRepository } from './meta-capi.repository'
import type { IMetaCapiProvider } from './ports/meta-capi-provider.interface'
import type { UpsertMetaCapiConfigDto, MetaCapiEventName, EventRules } from './dto/upsert-meta-capi-config.dto'

export interface FireEventOptions {
  tenantId: string
  eventName: MetaCapiEventName
  externalId?: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  value?: number
  currency?: string
  orderId?: string
}

@Injectable()
export class MetaCapiService {
  private readonly logger = new Logger(MetaCapiService.name)

  constructor(
    @Inject(META_CAPI_PROVIDER)
    private readonly provider: IMetaCapiProvider,
    private readonly repository: MetaCapiRepository,
    private readonly crypto: AesCryptoService,
  ) {}

  async getConfig(tenantId: string) {
    const config = await this.repository.findByTenant(tenantId)
    if (!config) return { data: null }

    return {
      data: {
        id: config.id,
        pixelId: config.pixelId,
        isActive: config.isActive,
        eventRules: config.eventRules as EventRules,
        testEventCode: config.testEventCode ?? null,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
    }
  }

  async upsertConfig(tenantId: string, dto: UpsertMetaCapiConfigDto) {
    let encryptedToken: string

    if (dto.accessToken === '_unchanged_') {
      const existing = await this.repository.findByTenant(tenantId)
      if (!existing) {
        throw AppException.notFound('META_CAPI_NOT_FOUND', 'Configure o Access Token na primeira vez', {})
      }
      encryptedToken = existing.accessToken
    } else {
      encryptedToken = this.crypto.encrypt(dto.accessToken)
    }

    const saved = await this.repository.upsert(tenantId, {
      pixelId: dto.pixelId,
      accessToken: encryptedToken,
      isActive: dto.isActive ?? true,
      eventRules: dto.eventRules ?? {},
      testEventCode: dto.testEventCode ?? null,
    })

    return {
      data: {
        id: saved.id,
        pixelId: saved.pixelId,
        isActive: saved.isActive,
        eventRules: saved.eventRules as EventRules,
        testEventCode: saved.testEventCode ?? null,
      },
    }
  }

  async removeConfig(tenantId: string) {
    await this.repository.softDelete(tenantId)
    return { data: { deleted: true } }
  }

  async testEvent(tenantId: string, eventName: MetaCapiEventName = 'Lead') {
    const config = await this.repository.findByTenant(tenantId)
    if (!config?.isActive) {
      throw AppException.notFound('META_CAPI_NOT_CONFIGURED', 'Integração Meta não configurada', {})
    }

    const accessToken = this.crypto.decrypt(config.accessToken)

    await this.provider.sendEvent(
      config.pixelId,
      accessToken,
      { eventName, externalId: `test_${tenantId}`, actionSource: 'system_generated' },
      config.testEventCode ?? undefined,
    )

    return { data: { ok: true, eventName } }
  }

  async fireEvent(opts: FireEventOptions): Promise<void> {
    const config = await this.repository.findByTenant(opts.tenantId)

    if (!config?.isActive) {
      this.logger.log(`[fireEvent] Ignorado — integração inativa ou não configurada (tenant=${opts.tenantId} evento=${opts.eventName})`)
      return
    }

    const eventRules = (config.eventRules ?? {}) as EventRules
    if (!eventRules[opts.eventName]) {
      this.logger.log(`[fireEvent] Ignorado — regra desabilitada para evento="${opts.eventName}" (tenant=${opts.tenantId})`)
      return
    }

    const accessToken = this.crypto.decrypt(config.accessToken)
    const testCode = config.testEventCode ?? undefined

    this.logger.log(`[fireEvent] Enviando evento="${opts.eventName}" pixelId=${config.pixelId} tenant=${opts.tenantId} phone=${opts.phone ?? '-'} testCode=${testCode ?? 'none'}`)

    try {
      await this.provider.sendEvent(
        config.pixelId,
        accessToken,
        {
          eventName: opts.eventName,
          externalId: opts.externalId,
          email: opts.email,
          phone: opts.phone,
          firstName: opts.firstName,
          lastName: opts.lastName,
          value: opts.value,
          currency: opts.currency,
          orderId: opts.orderId,
          actionSource: 'business_messaging',
        },
        testCode,
      )
      this.logger.log(`[fireEvent] Evento="${opts.eventName}" enviado com sucesso (tenant=${opts.tenantId})`)
    } catch (err) {
      this.logger.error(`[fireEvent] Falhou — evento="${opts.eventName}" tenant=${opts.tenantId}: ${err}`)
    }
  }
}
