import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class InstagramConfig {
  constructor(private readonly config: ConfigService) {}
  get(key: string): string { return this.config.get<string>(key, '') }
  get mode(): 'simulated' | 'meta' { return this.get('INSTAGRAM_MODE') === 'meta' ? 'meta' : 'simulated' }
  enabled(): boolean { return this.get('INSTAGRAM_ENABLED') === 'true' && this.get('NODE_ENV') !== 'production' }
  allowed(tenantId: string): boolean {
    return this.enabled() && this.get('INSTAGRAM_PILOT_TENANT_IDS').split(',').map(x => x.trim()).filter(Boolean).includes(tenantId)
  }
  assertTenant(tenantId: string): void { if (!this.allowed(tenantId)) throw new NotFoundException('Piloto Instagram indisponível') }
  assertEnabled(): void { if (!this.enabled()) throw new NotFoundException('Piloto Instagram indisponível') }
  assertSimulated(tenantId: string): void {
    this.assertTenant(tenantId)
    if (this.mode !== 'simulated') throw new NotFoundException('Simulação indisponível')
  }
  private controlledReplyScope(): { tenantId: string; instagramId: string; participantId: string } | null | false {
    const raw = this.get('INSTAGRAM_CONTROLLED_REPLY_SCOPE')
    if (!raw) return null
    if (raw.length > 1000) return false
    try {
      const scope = JSON.parse(raw)
      if (!scope || Array.isArray(scope) || Object.keys(scope).sort().join(',') !== 'instagramId,participantId,tenantId' ||
          typeof scope.tenantId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(scope.tenantId) ||
          typeof scope.instagramId !== 'string' || !/^\d{1,40}$/.test(scope.instagramId) ||
          typeof scope.participantId !== 'string' || !/^\d{1,40}$/.test(scope.participantId) ||
          scope.instagramId === scope.participantId) return false
      return scope
    } catch { return false }
  }
  realSendingAllowed(tenantId: string): boolean {
    const scope = this.controlledReplyScope()
    return this.allowed(tenantId) && this.mode === 'meta' && this.get('INSTAGRAM_SEND_ENABLED') === 'true' &&
      !!scope && scope.tenantId === tenantId
  }
  transportTargetAllowed(instagramId: string, participantId: string): boolean {
    const scope = this.controlledReplyScope()
    return this.get('INSTAGRAM_SEND_ENABLED') === 'true' && !!scope &&
      scope.instagramId === instagramId && scope.participantId === participantId
  }
  replyTargetAllowed(tenantId: string, instagramId: string, participantId: string): boolean {
    return this.realSendingAllowed(tenantId) && this.transportTargetAllowed(instagramId, participantId)
  }
  assertMeta(): void {
    if (this.mode !== 'meta' || !this.get('INSTAGRAM_APP_ID') || !this.get('INSTAGRAM_APP_SECRET') ||
        !/^\d+$/.test(this.get('INSTAGRAM_CONFIG_ID')) ||
        !/^v\d+\.\d+$/.test(this.get('INSTAGRAM_API_VERSION')) ||
        !this.get('INSTAGRAM_REDIRECT_URI').startsWith('https://')) {
      throw new ServiceUnavailableException('Configure o aplicativo Meta de testes antes de conectar')
    }
  }
}
