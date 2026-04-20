import { Injectable } from '@nestjs/common'
import { IntegrationsRepository } from './integrations.repository'
import { GoogleAuthService } from './adapters/google/google-auth.service'
import { AppException } from '@core/errors/app.exception'

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly googleAuth: GoogleAuthService,
  ) {}

  getConnectUrl(tenantId: string, userId: string) {
    return this.googleAuth.getAuthUrl(tenantId, userId)
  }

  async handleCallback(code: string, state: string) {
    const { tenantId, userId, codeVerifier } = this.googleAuth.parseState(state)

    const tokens = await this.googleAuth.exchangeCode(code, codeVerifier)

    const tokenInfo = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.accessToken}`,
    ).then((r) => r.json() as Promise<{ email: string }>)

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)

    return this.repository.create(tenantId, userId, 'google_calendar', {
      providerAccountId: tokenInfo.email,
      accessToken: this.googleAuth.encrypt(tokens.accessToken),
      refreshToken: this.googleAuth.encrypt(tokens.refreshToken),
      tokenExpiresAt: expiresAt,
      scopes: tokens.scopes,
    })
  }

  async findAll(tenantId: string) {
    const integrations = await this.repository.findByTenant(tenantId)
    return {
      data: integrations.map((i) => ({
        id: i.id,
        provider: i.provider,
        providerAccountId: i.providerAccountId,
        isActive: i.isActive,
        tokenExpiresAt: i.tokenExpiresAt,
        createdAt: i.createdAt,
      })),
    }
  }

  async findById(tenantId: string, id: string) {
    const integration = await this.repository.findById(tenantId, id)
    if (!integration) {
      throw AppException.notFound('INTEGRATION_NOT_FOUND', 'Integração não encontrada', { id })
    }
    return { data: integration }
  }

  async disconnect(tenantId: string, id: string) {
    const integration = await this.repository.findById(tenantId, id)
    if (!integration) {
      throw AppException.notFound('INTEGRATION_NOT_FOUND', 'Integração não encontrada', { id })
    }

    if (integration.accessToken) {
      try {
        const accessToken = this.googleAuth.decrypt(integration.accessToken)
        await this.googleAuth.revokeToken(accessToken)
      } catch {
        // Best-effort revocation
      }
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  async getDecryptedAccessToken(tenantId: string, integrationId: string): Promise<string> {
    const integration = await this.repository.findById(tenantId, integrationId)
    if (!integration) {
      throw AppException.notFound('INTEGRATION_NOT_FOUND', 'Integração não encontrada', { id: integrationId })
    }
    if (!integration.isActive) {
      throw new AppException('INTEGRATION_NOT_CONNECTED', 'Integração desconectada')
    }

    if (integration.tokenExpiresAt && new Date() >= integration.tokenExpiresAt) {
      const decryptedRefresh = this.googleAuth.decrypt(integration.refreshToken!)
      const refreshed = await this.googleAuth.refreshAccessToken(decryptedRefresh)
      return refreshed.accessToken
    }

    return this.googleAuth.decrypt(integration.accessToken!)
  }
}
