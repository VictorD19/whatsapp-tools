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
  assertMeta(): void {
    if (this.mode !== 'meta' || !this.get('INSTAGRAM_APP_ID') || !this.get('INSTAGRAM_APP_SECRET') ||
        !/^v\d+\.\d+$/.test(this.get('INSTAGRAM_API_VERSION')) ||
        !this.get('INSTAGRAM_REDIRECT_URI').startsWith('https://')) {
      throw new ServiceUnavailableException('Configure o aplicativo Meta de testes antes de conectar')
    }
  }
}
