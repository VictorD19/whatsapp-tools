import { Test, TestingModule } from '@nestjs/testing'
import { UsersService } from '../users.service'
import { UsersRepository } from '../users.repository'
import { PrismaService } from '@core/database/prisma.service'

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}))

describe('UsersService', () => {
  let service: UsersService
  let repository: jest.Mocked<UsersRepository>
  let prisma: { tenant: { findUnique: jest.Mock } }

  const tenantId = 'tenant-123'
  const userId = 'user-456'
  const mockTenant = { plan: { maxUsers: 5 } }

  const mockUser = {
    id: userId,
    tenantId,
    name: 'John Doe',
    email: 'john@example.com',
    role: 'admin',
    isSuperAdmin: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null as Date | null,
  }

  beforeEach(async () => {
    const mockRepository = {
      findMany: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      countAdmins: jest.fn(),
      countActiveByTenant: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updatePassword: jest.fn(),
      softDelete: jest.fn(),
    }

    prisma = {
      tenant: { findUnique: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: mockRepository },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile()

    service = module.get(UsersService)
    repository = module.get(UsersRepository)
  })

  describe('findMany', () => {
    it('should return paginated users for tenant', async () => {
      repository.findMany.mockResolvedValue({
        users: [mockUser],
        total: 1,
      })

      const result = await service.findMany(tenantId, {
        page: 1,
        limit: 20,
        includeDeleted: false,
      })

      expect(result.data).toHaveLength(1)
      expect(result.meta.total).toBe(1)
      expect(result.meta.page).toBe(1)
      expect(result.meta.limit).toBe(20)
      expect(result.meta.totalPages).toBe(1)
      expect(repository.findMany).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        includeDeleted: false,
      })
    })
  })

  describe('findById', () => {
    it('should return a user', async () => {
      repository.findById.mockResolvedValue(mockUser)

      const result = await service.findById(tenantId, userId)

      expect(result).toEqual(mockUser)
      expect(repository.findById).toHaveBeenCalledWith(tenantId, userId)
    })

    it('should throw USER_NOT_FOUND if not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.findById(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
    })
  })

  describe('create', () => {
    it('should create a user successfully', async () => {
      repository.findByEmail.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(mockTenant)
      repository.countActiveByTenant.mockResolvedValue(2)
      repository.create.mockResolvedValue(mockUser)

      const result = await service.create(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        role: 'admin',
      })

      expect(result).toEqual(mockUser)
      expect(repository.findByEmail).toHaveBeenCalledWith('john@example.com')
      expect(repository.create).toHaveBeenCalledWith({
        tenantId,
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashed-password',
        role: 'admin',
      })
    })

    it('should throw USER_EMAIL_ALREADY_EXISTS if email is taken', async () => {
      repository.findByEmail.mockResolvedValue(mockUser)

      await expect(
        service.create(tenantId, {
          name: 'Jane',
          email: 'john@example.com',
          password: 'secret123',
          role: 'agent',
        }),
      ).rejects.toMatchObject({ code: 'USER_EMAIL_ALREADY_EXISTS' })
    })

    it('should throw USER_LIMIT_REACHED when at max users', async () => {
      repository.findByEmail.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(mockTenant)
      repository.countActiveByTenant.mockResolvedValue(5)

      await expect(
        service.create(tenantId, {
          name: 'New User',
          email: 'new@example.com',
          password: 'secret123',
          role: 'agent',
        }),
      ).rejects.toMatchObject({ code: 'USER_LIMIT_REACHED' })
    })

    it('should create user when under limit', async () => {
      repository.findByEmail.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(mockTenant)
      repository.countActiveByTenant.mockResolvedValue(4)
      repository.create.mockResolvedValue(mockUser)

      const result = await service.create(tenantId, {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'secret123',
        role: 'admin',
      })

      expect(result).toEqual(mockUser)
      expect(repository.countActiveByTenant).toHaveBeenCalledWith(tenantId)
    })
  })

  describe('update', () => {
    it('should update a user successfully', async () => {
      const updated = { ...mockUser, name: 'John Updated' }
      repository.findById.mockResolvedValue(mockUser)
      repository.update.mockResolvedValue(updated)

      const result = await service.update(tenantId, userId, { name: 'John Updated' })

      expect(result.name).toBe('John Updated')
      expect(repository.update).toHaveBeenCalledWith(tenantId, userId, { name: 'John Updated' })
    })

    it('should throw USER_NOT_FOUND if user does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.update(tenantId, 'nonexistent', { name: 'New Name' }),
      ).rejects.toMatchObject({ code: 'USER_NOT_FOUND' })
    })
  })

  describe('changePassword', () => {
    it('should allow admin to change another user password', async () => {
      const targetUser = { ...mockUser, id: 'user-target', role: 'agent' }
      repository.findById.mockResolvedValue(targetUser)
      repository.updatePassword.mockResolvedValue(targetUser)

      const result = await service.changePassword(
        tenantId,
        'user-target',
        { id: userId, role: 'admin' },
        { password: 'newpassword123' },
      )

      expect(result).toEqual(targetUser)
      expect(repository.updatePassword).toHaveBeenCalledWith(tenantId, 'user-target', 'hashed-password')
    })

    it('should allow user to change own password', async () => {
      const agentUser = { ...mockUser, id: 'agent-1', role: 'agent' }
      repository.findById.mockResolvedValue(agentUser)
      repository.updatePassword.mockResolvedValue(agentUser)

      const result = await service.changePassword(
        tenantId,
        'agent-1',
        { id: 'agent-1', role: 'agent' },
        { password: 'newpassword123' },
      )

      expect(result).toEqual(agentUser)
      expect(repository.updatePassword).toHaveBeenCalledWith(tenantId, 'agent-1', 'hashed-password')
    })

    it('should throw AUTH_FORBIDDEN_INSUFFICIENT_ROLE if non-admin tries to change another user password', async () => {
      await expect(
        service.changePassword(
          tenantId,
          'user-target',
          { id: 'agent-1', role: 'agent' },
          { password: 'newpassword123' },
        ),
      ).rejects.toMatchObject({ code: 'AUTH_FORBIDDEN_INSUFFICIENT_ROLE' })
    })
  })

  describe('softDelete', () => {
    it('should soft delete a user successfully', async () => {
      const agentUser = { ...mockUser, id: 'agent-1', role: 'agent' }
      repository.findById.mockResolvedValue(agentUser)
      repository.softDelete.mockResolvedValue({ ...agentUser, deletedAt: new Date() })

      const result = await service.softDelete(tenantId, 'agent-1', userId)

      expect(result.deletedAt).toBeTruthy()
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'agent-1')
    })

    it('should throw USER_CANNOT_DELETE_SELF', async () => {
      await expect(
        service.softDelete(tenantId, userId, userId),
      ).rejects.toMatchObject({ code: 'USER_CANNOT_DELETE_SELF' })
    })

    it('should throw USER_LAST_ADMIN if deleting the last admin', async () => {
      const adminUser = { ...mockUser, id: 'admin-2', role: 'admin' }
      repository.findById.mockResolvedValue(adminUser)
      repository.countAdmins.mockResolvedValue(1)

      await expect(
        service.softDelete(tenantId, 'admin-2', userId),
      ).rejects.toMatchObject({ code: 'USER_LAST_ADMIN' })
    })

    it('should allow deleting admin when there are multiple admins', async () => {
      const adminUser = { ...mockUser, id: 'admin-2', role: 'admin' }
      repository.findById.mockResolvedValue(adminUser)
      repository.countAdmins.mockResolvedValue(2)
      repository.softDelete.mockResolvedValue({ ...adminUser, deletedAt: new Date() })

      const result = await service.softDelete(tenantId, 'admin-2', userId)

      expect(result.deletedAt).toBeTruthy()
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'admin-2')
    })
  })
})
