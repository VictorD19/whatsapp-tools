import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { GoogleAuthService } from '../adapters/google/google-auth.service'

describe('GoogleAuthService', () => {
  let service: GoogleAuthService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                GOOGLE_CLIENT_ID: 'test-client-id',
                GOOGLE_CLIENT_SECRET: 'test-client-secret',
                GOOGLE_REDIRECT_URL: 'http://localhost:3000/integrations/google/callback',
                ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
              }
              return map[key]
            }),
          },
        },
      ],
    }).compile()

    service = module.get(GoogleAuthService)
  })

  describe('getAuthUrl', () => {
    it('should generate a valid Google OAuth2 URL with PKCE', () => {
      const result = service.getAuthUrl('tenant-1', 'user-1')

      expect(result.url).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(result.url).toContain('client_id=test-client-id')
      expect(result.url).toContain('redirect_uri=')
      expect(result.url).toContain('scope=')
      expect(result.state).toBeTruthy()
      expect(result.codeVerifier).toBeTruthy()
    })
  })

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a value correctly', () => {
      const original = 'my-secret-token'
      const encrypted = service.encrypt(original)

      expect(encrypted).not.toBe(original)
      expect(service.decrypt(encrypted)).toBe(original)
    })
  })

  describe('exchangeCode', () => {
    it('should call Google token endpoint and return tokens', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: 'access-123',
          refresh_token: 'refresh-123',
          expires_in: 3600,
          scope: 'calendar.readonly calendar.events',
        }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await service.exchangeCode('auth-code', 'code-verifier')

      expect(result.accessToken).toBe('access-123')
      expect(result.refreshToken).toBe('refresh-123')
      expect(result.expiresIn).toBe(3600)
    })

    it('should throw when Google returns error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('invalid_grant'),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      await expect(service.exchangeCode('bad-code', 'verifier')).rejects.toThrow()
    })
  })

  describe('revokeToken', () => {
    it('should call Google revoke endpoint', async () => {
      const mockResponse = { ok: true }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      await service.revokeToken('access-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke?token=access-123',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
