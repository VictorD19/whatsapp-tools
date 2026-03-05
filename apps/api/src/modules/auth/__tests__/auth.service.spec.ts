import { Test, TestingModule } from '@nestjs/testing'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'
import { AuthService } from '../auth.service'
import { AuthRepository } from '../auth.repository'
import { PipelineService } from '@modules/pipeline/pipeline.service'
import { TagService } from '@modules/tag/tag.service'
import { PlanService } from '@modules/plan/plan.service'

jest.mock('bcryptjs')

describe('AuthService', () => {
  let service: AuthService
  let repo: jest.Mocked<AuthRepository>
  let jwt: jest.Mocked<JwtService>
  let pipelineService: jest.Mocked<PipelineService>
  let tagService: jest.Mocked<TagService>
  let planService: jest.Mocked<PlanService>

  const tenantId = 'tenant-123'
  const userId = 'user-456'

  const mockTenant = {
    id: tenantId,
    name: 'Acme Corp',
    slug: 'acme-corp',
    locale: 'pt-BR',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    plan: { name: 'Pro', slug: 'pro' },
  }

  const mockUser = {
    id: userId,
    tenantId,
    name: 'John Doe',
    email: 'john@acme.com',
    password: 'hashed-password',
    role: 'admin',
    isSuperAdmin: false,
    tenant: mockTenant,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  beforeEach(async () => {
    const mockRepo = {
      findUserByEmail: jest.fn(),
      createTenant: jest.fn(),
      createUser: jest.fn(),
    }

    const mockJwt = {
      sign: jest.fn(),
    }

    const mockPipelineService = {
      createDefaultPipeline: jest.fn(),
    }

    const mockTagService = {
      seedDefaultTags: jest.fn(),
    }

    const mockPlanService = {
      findDefault: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: AuthRepository, useValue: mockRepo },
        { provide: JwtService, useValue: mockJwt },
        { provide: PipelineService, useValue: mockPipelineService },
        { provide: TagService, useValue: mockTagService },
        { provide: PlanService, useValue: mockPlanService },
      ],
    }).compile()

    service = module.get(AuthService)
    repo = module.get(AuthRepository)
    jwt = module.get(JwtService)
    pipelineService = module.get(PipelineService)
    tagService = module.get(TagService)
    planService = module.get(PlanService)
  })

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      repo.findUserByEmail.mockResolvedValue(mockUser as never)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      jwt.sign
        .mockReturnValueOnce('access-token-123')
        .mockReturnValueOnce('refresh-token-456')

      const result = await service.login('john@acme.com', 'correct-password')

      expect(result.accessToken).toBe('access-token-123')
      expect(result.refreshToken).toBe('refresh-token-456')
      expect(result.user.id).toBe(userId)
      expect(result.user.email).toBe('john@acme.com')
      expect(result.user.tenant.id).toBe(tenantId)
      expect(result.user.tenant.plan).toBe('pro')
      expect(repo.findUserByEmail).toHaveBeenCalledWith('john@acme.com')
      expect(bcrypt.compare).toHaveBeenCalledWith('correct-password', 'hashed-password')
      expect(jwt.sign).toHaveBeenCalledTimes(2)
    })

    it('should throw AUTH_INVALID_CREDENTIALS if user not found', async () => {
      repo.findUserByEmail.mockResolvedValue(null)
      ;(bcrypt.compare as jest.Mock).mockClear()

      await expect(
        service.login('unknown@test.com', 'password'),
      ).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
      })

      expect(bcrypt.compare).not.toHaveBeenCalled()
    })

    it('should throw AUTH_INVALID_CREDENTIALS on wrong password', async () => {
      repo.findUserByEmail.mockResolvedValue(mockUser as never)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        service.login('john@acme.com', 'wrong-password'),
      ).rejects.toMatchObject({
        code: 'AUTH_INVALID_CREDENTIALS',
      })
    })
  })

  describe('register', () => {
    const registerData = {
      tenantName: 'New Company',
      name: 'Jane Doe',
      email: 'jane@new.com',
      password: 'securepass123',
    }

    it('should create tenant, user, pipeline, tags and return tokens', async () => {
      repo.findUserByEmail.mockResolvedValue(null)
      planService.findDefault.mockResolvedValue({
        id: 'plan-free',
        name: 'Free',
        slug: 'free',
      } as never)
      repo.createTenant.mockResolvedValue({
        id: 'new-tenant-id',
        name: 'New Company',
        slug: 'new-company',
      } as never)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password')
      repo.createUser.mockResolvedValue({
        id: 'new-user-id',
        tenantId: 'new-tenant-id',
        name: 'Jane Doe',
        email: 'jane@new.com',
        password: 'hashed-new-password',
        role: 'admin',
        isSuperAdmin: false,
        tenant: {
          id: 'new-tenant-id',
          name: 'New Company',
          slug: 'new-company',
          plan: { name: 'Free', slug: 'free' },
        },
      } as never)
      pipelineService.createDefaultPipeline.mockResolvedValue(undefined as never)
      tagService.seedDefaultTags.mockResolvedValue(undefined as never)
      jwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token')

      const result = await service.register(registerData)

      expect(result.accessToken).toBe('new-access-token')
      expect(result.refreshToken).toBe('new-refresh-token')
      expect(result.user.email).toBe('jane@new.com')
      expect(result.user.tenant.name).toBe('New Company')

      expect(repo.findUserByEmail).toHaveBeenCalledWith('jane@new.com')
      expect(planService.findDefault).toHaveBeenCalled()
      expect(repo.createTenant).toHaveBeenCalledWith({
        name: 'New Company',
        slug: 'new-company',
        planId: 'plan-free',
      })
      expect(bcrypt.hash).toHaveBeenCalledWith('securepass123', 10)
      expect(repo.createUser).toHaveBeenCalledWith({
        tenantId: 'new-tenant-id',
        name: 'Jane Doe',
        email: 'jane@new.com',
        password: 'hashed-new-password',
        role: 'admin',
      })
      expect(pipelineService.createDefaultPipeline).toHaveBeenCalledWith('new-tenant-id')
      expect(tagService.seedDefaultTags).toHaveBeenCalledWith('new-tenant-id')
    })

    it('should throw AUTH_EMAIL_ALREADY_EXISTS if email taken', async () => {
      repo.findUserByEmail.mockResolvedValue(mockUser as never)

      await expect(service.register(registerData)).rejects.toMatchObject({
        code: 'AUTH_EMAIL_ALREADY_EXISTS',
      })

      expect(repo.createTenant).not.toHaveBeenCalled()
      expect(repo.createUser).not.toHaveBeenCalled()
    })

    it('should slugify tenant name correctly', async () => {
      repo.findUserByEmail.mockResolvedValue(null)
      planService.findDefault.mockResolvedValue({
        id: 'plan-free',
        name: 'Free',
        slug: 'free',
      } as never)
      repo.createTenant.mockResolvedValue({
        id: 'tenant-id',
        name: 'Empresa Brasil Ltda',
        slug: 'empresa-brasil-ltda',
      } as never)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue('hashed')
      repo.createUser.mockResolvedValue({
        ...mockUser,
        id: 'new-id',
        tenantId: 'tenant-id',
        tenant: {
          id: 'tenant-id',
          name: 'Empresa Brasil Ltda',
          slug: 'empresa-brasil-ltda',
          plan: { name: 'Free', slug: 'free' },
        },
      } as never)
      pipelineService.createDefaultPipeline.mockResolvedValue(undefined as never)
      tagService.seedDefaultTags.mockResolvedValue(undefined as never)
      jwt.sign.mockReturnValue('token')

      await service.register({
        ...registerData,
        tenantName: 'Empresa Brasil Ltda',
      })

      expect(repo.createTenant).toHaveBeenCalledWith({
        name: 'Empresa Brasil Ltda',
        slug: 'empresa-brasil-ltda',
        planId: 'plan-free',
      })
    })
  })

  describe('generateAuthResponse (via login)', () => {
    it('should generate accessToken with correct payload', async () => {
      repo.findUserByEmail.mockResolvedValue(mockUser as never)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      jwt.sign.mockReturnValue('token')

      await service.login('john@acme.com', 'password')

      const expectedPayload = {
        sub: userId,
        tenantId,
        email: 'john@acme.com',
        role: 'admin',
        isSuperAdmin: false,
      }

      expect(jwt.sign).toHaveBeenNthCalledWith(1, expectedPayload, {
        expiresIn: '15m',
      })
      expect(jwt.sign).toHaveBeenNthCalledWith(2, expectedPayload, {
        secret: undefined,
        expiresIn: '7d',
      })
    })

    it('should not expose password in user response', async () => {
      repo.findUserByEmail.mockResolvedValue(mockUser as never)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      jwt.sign.mockReturnValue('token')

      const result = await service.login('john@acme.com', 'password')

      expect(result.user).not.toHaveProperty('password')
      expect(result.user).toHaveProperty('id')
      expect(result.user).toHaveProperty('name')
      expect(result.user).toHaveProperty('email')
      expect(result.user).toHaveProperty('role')
      expect(result.user).toHaveProperty('isSuperAdmin')
      expect(result.user).toHaveProperty('tenant')
    })

    it('should include locale settings in user tenant response', async () => {
      repo.findUserByEmail.mockResolvedValue(mockUser as never)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
      jwt.sign.mockReturnValue('token')

      const result = await service.login('john@acme.com', 'password')

      expect(result.user.tenant).toHaveProperty('locale', 'pt-BR')
      expect(result.user.tenant).toHaveProperty('timezone', 'America/Sao_Paulo')
      expect(result.user.tenant).toHaveProperty('currency', 'BRL')
    })
  })
})
