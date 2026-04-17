import { Test, TestingModule } from '@nestjs/testing'
import { IntegrationsService } from '../integrations.service'
import { IntegrationsRepository } from '../integrations.repository'
import { GoogleAuthService } from '../adapters/google/google-auth.service'

describe('IntegrationsService', () => {
  let service: IntegrationsService
  let repository: jest.Mocked<IntegrationsRepository>
  let googleAuth: jest.Mocked<GoogleAuthService>

  const tenantId = 'tenant-1'
  const userId = 'user-1'

  const mockIntegration = {
    id: 'int-1',
    tenantId,
    userId,
    provider: 'google_calendar',
    providerAccountId: 'joao@gmail.com',
    accessToken: 'encrypted-access',
    refreshToken: 'encrypted-refresh',
    tokenExpiresAt: new Date(Date.now() + 3600_000),
    scopes: ['calendar.readonly', 'calendar.events'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    calendarEvents: [],
    tenant: {} as any,
    user: {} as any,
  }

  beforeEach(async () => {
    const mockRepo = {
      findByTenantAndUser: jest.fn(),
      findByTenant: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
      createCalendarEvent: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: IntegrationsRepository, useValue: mockRepo },
        {
          provide: GoogleAuthService,
          useValue: {
            getAuthUrl: jest.fn(),
            exchangeCode: jest.fn(),
            encrypt: jest.fn((v: string) => `enc:${v}`),
            decrypt: jest.fn((v: string) => v.replace('enc:', '')),
            parseState: jest.fn(),
            revokeToken: jest.fn(),
            refreshAccessToken: jest.fn(),
          },
        },
      ],
    }).compile()

    service = module.get(IntegrationsService)
    repository = module.get(IntegrationsRepository)
    googleAuth = module.get(GoogleAuthService)
  })

  describe('getConnectUrl', () => {
    it('should return Google OAuth URL', () => {
      googleAuth.getAuthUrl.mockReturnValue({
        url: 'https://accounts.google.com/...',
        codeVerifier: 'verifier-123',
        state: 'state-123',
      })

      const result = service.getConnectUrl(tenantId, userId)

      expect(result.url).toContain('accounts.google.com')
      expect(result.codeVerifier).toBe('verifier-123')
      expect(googleAuth.getAuthUrl).toHaveBeenCalledWith(tenantId, userId)
    })
  })

  describe('handleCallback', () => {
    it('should exchange code and create integration', async () => {
      googleAuth.parseState.mockReturnValue({ tenantId, userId })
      googleAuth.exchangeCode.mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        expiresIn: 3600,
        scopes: ['calendar.readonly'],
      })
      googleAuth.encrypt.mockImplementation((v: string) => `enc:${v}`)
      repository.create.mockResolvedValue(mockIntegration)

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ email: 'joao@gmail.com' }),
      })

      const result = await service.handleCallback('auth-code', 'state-123', 'verifier-123')

      expect(result.provider).toBe('google_calendar')
      expect(repository.create).toHaveBeenCalledWith(
        tenantId,
        userId,
        'google_calendar',
        expect.objectContaining({
          accessToken: 'enc:access-123',
          refreshToken: 'enc:refresh-123',
        }),
      )
    })
  })

  describe('findAll', () => {
    it('should return all integrations for tenant', async () => {
      repository.findByTenant.mockResolvedValue([mockIntegration as any])

      const result = await service.findAll(tenantId)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].provider).toBe('google_calendar')
    })
  })

  describe('disconnect', () => {
    it('should soft delete and revoke token', async () => {
      repository.findById.mockResolvedValue(mockIntegration as any)
      googleAuth.decrypt.mockReturnValue('access-123')
      repository.softDelete.mockResolvedValue({ ...mockIntegration, deletedAt: new Date() } as any)

      const result = await service.disconnect(tenantId, 'int-1')

      expect(result.data.deleted).toBe(true)
      expect(googleAuth.revokeToken).toHaveBeenCalledWith('access-123')
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'int-1')
    })

    it('should throw INTEGRATION_NOT_FOUND when integration does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.disconnect(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'INTEGRATION_NOT_FOUND' })
    })
  })
})
