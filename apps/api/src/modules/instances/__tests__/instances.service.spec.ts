import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { InstancesService } from '../instances.service'
import { InstancesRepository } from '../instances.repository'
import { InstancesGateway } from '../instances.gateway'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { PrismaService } from '@core/database/prisma.service'
import { LoggerService } from '@core/logger/logger.service'
import { AppException } from '@core/errors/app.exception'

describe('InstancesService', () => {
  let service: InstancesService
  let repository: jest.Mocked<InstancesRepository>
  let whatsapp: jest.Mocked<WhatsAppService>
  let gateway: jest.Mocked<InstancesGateway>
  let prisma: { tenant: { findUnique: jest.Mock } }

  const tenantId = 'tenant-123'
  const mockTenant = { slug: 'acme', plan: { maxInstances: 3 } }

  const mockInstance = {
    id: 'inst-1',
    tenantId,
    name: 'vendas',
    phone: null,
    status: 'DISCONNECTED' as const,
    evolutionId: 'acme-vendas',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findById: jest.fn(),
      findByEvolutionId: jest.fn(),
      findByName: jest.fn(),
      countByTenant: jest.fn(),
      updateStatus: jest.fn(),
      softDelete: jest.fn(),
    }

    const mockWhatsapp = {
      createInstance: jest.fn(),
      connectInstance: jest.fn(),
      disconnectInstance: jest.fn(),
      deleteInstance: jest.fn(),
      setWebhook: jest.fn(),
    }

    const mockGateway = {
      emitQrUpdated: jest.fn(),
      emitConnected: jest.fn(),
      emitDisconnected: jest.fn(),
      emitStatusChanged: jest.fn(),
    }

    prisma = {
      tenant: { findUnique: jest.fn() },
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstancesService,
        { provide: InstancesRepository, useValue: mockRepository },
        { provide: WhatsAppService, useValue: mockWhatsapp },
        { provide: InstancesGateway, useValue: mockGateway },
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('http://localhost:3001') } },
        { provide: LoggerService, useValue: { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } },
      ],
    }).compile()

    service = module.get(InstancesService)
    repository = module.get(InstancesRepository)
    whatsapp = module.get(WhatsAppService)
    gateway = module.get(InstancesGateway)
  })

  describe('create', () => {
    it('should create an instance successfully', async () => {
      repository.findByName.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(mockTenant)
      repository.countByTenant.mockResolvedValue(0)
      whatsapp.createInstance.mockResolvedValue({
        instanceId: 'tenant-123_vendas',
        status: 'DISCONNECTED',
      })
      repository.create.mockResolvedValue(mockInstance)

      const result = await service.create(tenantId, { name: 'vendas' })

      expect(result).toEqual(mockInstance)
      expect(whatsapp.createInstance).toHaveBeenCalledWith({
        name: 'vendas',
        tenantId,
        webhookUrl: 'http://localhost:3001/api/v1/webhooks/evolution/tenant-123_vendas',
      })
      expect(repository.create).toHaveBeenCalledWith({
        tenantId,
        name: 'vendas',
        evolutionId: 'tenant-123_vendas',
      })
    })

    it('should throw INSTANCE_NAME_ALREADY_EXISTS when name is duplicate', async () => {
      repository.findByName.mockResolvedValue(mockInstance)

      await expect(service.create(tenantId, { name: 'vendas' })).rejects.toThrow(AppException)
      await expect(service.create(tenantId, { name: 'vendas' })).rejects.toMatchObject({
        code: 'INSTANCE_NAME_ALREADY_EXISTS',
      })
    })

    it('should throw INSTANCE_LIMIT_REACHED when at max', async () => {
      repository.findByName.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(mockTenant)
      repository.countByTenant.mockResolvedValue(3)

      await expect(service.create(tenantId, { name: 'nova' })).rejects.toThrow(AppException)
      await expect(service.create(tenantId, { name: 'nova' })).rejects.toMatchObject({
        code: 'INSTANCE_LIMIT_REACHED',
      })
    })

    it('should throw TENANT_NOT_FOUND when tenant does not exist', async () => {
      repository.findByName.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(null)

      await expect(service.create(tenantId, { name: 'vendas' })).rejects.toMatchObject({
        code: 'TENANT_NOT_FOUND',
      })
    })

    it('should throw INSTANCE_EVOLUTION_CREATE_FAILED on provider error', async () => {
      repository.findByName.mockResolvedValue(null)
      prisma.tenant.findUnique.mockResolvedValue(mockTenant)
      repository.countByTenant.mockResolvedValue(0)
      whatsapp.createInstance.mockRejectedValue(new Error('Connection refused'))

      await expect(service.create(tenantId, { name: 'vendas' })).rejects.toMatchObject({
        code: 'INSTANCE_EVOLUTION_CREATE_FAILED',
      })
    })
  })

  describe('findAll', () => {
    it('should return all instances for tenant', async () => {
      repository.findAllByTenant.mockResolvedValue([mockInstance])
      // getInstanceStatus/getInstanceInfo are not defined in mock, so allSettled will catch
      const result = await service.findAll(tenantId)

      expect(result).toEqual([mockInstance])
      expect(repository.findAllByTenant).toHaveBeenCalledWith(tenantId)
    })

    it('should sync status from Evolution API when out of date', async () => {
      const connectedInstance = { ...mockInstance, status: 'DISCONNECTED' as const }
      repository.findAllByTenant.mockResolvedValue([connectedInstance])
      whatsapp.getInstanceStatus = jest.fn().mockResolvedValue('CONNECTED')
      whatsapp.getInstanceInfo = jest.fn().mockResolvedValue({ phone: '5511999999999' })
      repository.updateStatus.mockResolvedValue({ count: 1 })

      const result = await service.findAll(tenantId)

      expect(whatsapp.getInstanceStatus).toHaveBeenCalledWith('acme-vendas')
      expect(repository.updateStatus).toHaveBeenCalledWith(tenantId, 'inst-1', 'CONNECTED', '5511999999999')
      expect(result[0].status).toBe('CONNECTED')
    })

    it('should not update when status matches', async () => {
      repository.findAllByTenant.mockResolvedValue([mockInstance])
      whatsapp.getInstanceStatus = jest.fn().mockResolvedValue('DISCONNECTED')

      await service.findAll(tenantId)

      expect(repository.updateStatus).not.toHaveBeenCalled()
    })

    it('should gracefully handle Evolution API unreachable', async () => {
      repository.findAllByTenant.mockResolvedValue([mockInstance])
      whatsapp.getInstanceStatus = jest.fn().mockRejectedValue(new Error('Connection refused'))

      const result = await service.findAll(tenantId)

      // Should still return instances, status stays as-is
      expect(result).toEqual([mockInstance])
    })
  })

  describe('findByEvolutionId', () => {
    it('should delegate to repository', async () => {
      repository.findByEvolutionId.mockResolvedValue(mockInstance)

      const result = await service.findByEvolutionId('acme-vendas')

      expect(result).toEqual(mockInstance)
      expect(repository.findByEvolutionId).toHaveBeenCalledWith('acme-vendas')
    })
  })

  describe('findOne', () => {
    it('should return instance when found', async () => {
      repository.findById.mockResolvedValue(mockInstance)

      const result = await service.findOne(tenantId, 'inst-1')

      expect(result).toEqual(mockInstance)
    })

    it('should throw INSTANCE_NOT_FOUND when not found', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.findOne(tenantId, 'nonexistent')).rejects.toMatchObject({
        code: 'INSTANCE_NOT_FOUND',
      })
    })
  })

  describe('connect', () => {
    it('should return QR code and emit WebSocket events', async () => {
      repository.findById.mockResolvedValue(mockInstance)
      whatsapp.connectInstance.mockResolvedValue({
        qrCode: 'base64-qr-data',
        pairingCode: '1234',
      })
      repository.updateStatus.mockResolvedValue({ count: 1 })

      const result = await service.connect(tenantId, 'inst-1')

      expect(result).toEqual({ qrCode: 'base64-qr-data', pairingCode: '1234' })
      expect(repository.updateStatus).toHaveBeenCalledWith(tenantId, 'inst-1', 'CONNECTING')
      expect(gateway.emitQrUpdated).toHaveBeenCalledWith(tenantId, {
        instanceId: 'inst-1',
        qrCode: 'base64-qr-data',
      })
      expect(gateway.emitStatusChanged).toHaveBeenCalledWith(tenantId, {
        instanceId: 'inst-1',
        status: 'CONNECTING',
      })
    })

    it('should throw INSTANCE_ALREADY_CONNECTED if already connected', async () => {
      repository.findById.mockResolvedValue({ ...mockInstance, status: 'CONNECTED' })

      await expect(service.connect(tenantId, 'inst-1')).rejects.toMatchObject({
        code: 'INSTANCE_ALREADY_CONNECTED',
      })
    })

    it('should throw INSTANCE_EVOLUTION_SYNC_FAILED when connect fails', async () => {
      repository.findById.mockResolvedValue(mockInstance)
      whatsapp.connectInstance.mockRejectedValue(new Error('Timeout'))

      await expect(service.connect(tenantId, 'inst-1')).rejects.toMatchObject({
        code: 'INSTANCE_EVOLUTION_SYNC_FAILED',
      })
    })
  })

  describe('disconnect', () => {
    it('should disconnect and emit WebSocket events', async () => {
      repository.findById.mockResolvedValue({ ...mockInstance, status: 'CONNECTED' })
      whatsapp.disconnectInstance.mockResolvedValue(undefined)
      repository.updateStatus.mockResolvedValue({ count: 1 })

      await service.disconnect(tenantId, 'inst-1')

      expect(whatsapp.disconnectInstance).toHaveBeenCalledWith('acme-vendas')
      expect(repository.updateStatus).toHaveBeenCalledWith(tenantId, 'inst-1', 'DISCONNECTED')
      expect(gateway.emitDisconnected).toHaveBeenCalledWith(tenantId, { instanceId: 'inst-1' })
    })

    it('should throw INSTANCE_NOT_CONNECTED if already disconnected', async () => {
      repository.findById.mockResolvedValue(mockInstance)

      await expect(service.disconnect(tenantId, 'inst-1')).rejects.toMatchObject({
        code: 'INSTANCE_NOT_CONNECTED',
      })
    })

    it('should throw INSTANCE_EVOLUTION_SYNC_FAILED when disconnect fails', async () => {
      repository.findById.mockResolvedValue({ ...mockInstance, status: 'CONNECTED' })
      whatsapp.disconnectInstance.mockRejectedValue(new Error('API error'))

      await expect(service.disconnect(tenantId, 'inst-1')).rejects.toMatchObject({
        code: 'INSTANCE_EVOLUTION_SYNC_FAILED',
      })
    })
  })

  describe('remove', () => {
    it('should soft-delete instance and call Evolution delete', async () => {
      repository.findById.mockResolvedValue(mockInstance)
      whatsapp.deleteInstance.mockResolvedValue(undefined)
      repository.softDelete.mockResolvedValue({ count: 1 })

      await service.remove(tenantId, 'inst-1')

      expect(whatsapp.deleteInstance).toHaveBeenCalledWith('acme-vendas')
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'inst-1')
    })

    it('should soft-delete even if Evolution delete fails', async () => {
      repository.findById.mockResolvedValue(mockInstance)
      whatsapp.deleteInstance.mockRejectedValue(new Error('Not found'))
      repository.softDelete.mockResolvedValue({ count: 1 })

      await service.remove(tenantId, 'inst-1')

      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'inst-1')
    })
  })
})
