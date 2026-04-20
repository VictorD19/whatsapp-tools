import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

@Injectable()
export class GoogleAuthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUrl: string
  private readonly encryptionKey: Buffer

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '')
    this.clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET', '')
    this.redirectUrl = this.config.get<string>('GOOGLE_REDIRECT_URL', '')
    const key = this.config.get<string>('ENCRYPTION_KEY', '')
    if (!key || key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters')
    }
    this.encryptionKey = Buffer.from(key, 'utf-8')
  }

  getAuthUrl(tenantId: string, userId: string): { url: string; codeVerifier: string; state: string } {
    const codeVerifier = this.generateCodeVerifier()
    const state = Buffer.from(JSON.stringify({ tenantId, userId, codeVerifier, ts: Date.now() })).toString('base64url')

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUrl,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: codeVerifier,
      code_challenge_method: 'plain',
    })

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      codeVerifier,
      state,
    }
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
    scopes: string[]
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUrl,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google OAuth token exchange failed: ${response.status} ${error}`)
    }

    const data = await response.json() as any
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes: (data.scope as string).split(' '),
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.status}`)
    }

    const data = await response.json() as any
    return { accessToken: data.access_token, expiresIn: data.expires_in }
  }

  async revokeToken(accessToken: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST',
    })
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
  }

  decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64url')
    const iv = data.subarray(0, 12)
    const authTag = data.subarray(12, 28)
    const encrypted = data.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf-8')
  }

  parseState(state: string): { tenantId: string; userId: string; codeVerifier: string } {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    return { tenantId: parsed.tenantId, userId: parsed.userId, codeVerifier: parsed.codeVerifier }
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }
}
