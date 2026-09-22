import { Test, TestingModule } from '@nestjs/testing'
import { AssistantVoicesService } from '../assistant-voices.service'
import { AssistantVoicesRepository } from '../assistant-voices.repository'
import { TEXT_TO_SPEECH, VOICE_CLONING } from '@modules/ai/ai.tokens'
import { VoiceCloningError } from '@modules/ai/ports/voice-cloning.interface'
import { StorageService } from '@modules/storage/storage.service'

describe('AssistantVoicesService', () => {
  let service: AssistantVoicesService
  let repository: jest.Mocked<AssistantVoicesRepository>
  let voiceCloning: {
    isConfigured: jest.Mock
    cloneVoice: jest.Mock
    deleteVoice: jest.Mock
  }
  let tts: { synthesize: jest.Mock }
  let storage: { uploadRaw: jest.Mock; delete: jest.Mock }

  const tenantId = 'tenant-123'
  const now = new Date()

  const validSample = {
    buffer: Buffer.alloc(1024, 1),
    filename: 'voz.mp3',
    mimetype: 'audio/mpeg',
  }

  const mockVoice = {
    id: 'clyvoiceabc',
    tenantId,
    name: 'Comercial João',
    provider: 'elevenlabs',
    externalVoiceId: 'el-abc-123',
    previewKey: null as string | null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null as Date | null,
  }

  beforeEach(async () => {
    const mockRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      setPreviewKey: jest.fn(),
      softDelete: jest.fn(),
    }

    voiceCloning = {
      isConfigured: jest.fn().mockReturnValue(true),
      cloneVoice: jest.fn().mockResolvedValue({ externalVoiceId: 'el-abc-123' }),
      deleteVoice: jest.fn().mockResolvedValue(undefined),
    }
    tts = {
      synthesize: jest
        .fn()
        .mockResolvedValue({ audioBuffer: Buffer.from('mp3'), mimetype: 'audio/mpeg' }),
    }
    storage = { uploadRaw: jest.fn(), delete: jest.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssistantVoicesService,
        { provide: AssistantVoicesRepository, useValue: mockRepository },
        { provide: VOICE_CLONING, useValue: voiceCloning },
        { provide: TEXT_TO_SPEECH, useValue: tts },
        { provide: StorageService, useValue: storage },
      ],
    }).compile()

    service = module.get(AssistantVoicesService)
    repository = module.get(AssistantVoicesRepository)
  })

  describe('list', () => {
    it('retorna vozes do tenant sem expor o externalVoiceId', async () => {
      repository.findAll.mockResolvedValue([mockVoice] as any)

      const result = await service.list(tenantId)

      expect(repository.findAll).toHaveBeenCalledWith(tenantId)
      expect(result.data).toEqual([
        { id: 'clyvoiceabc', name: 'Comercial João', provider: 'elevenlabs', createdAt: now },
      ])
      expect(JSON.stringify(result)).not.toContain('el-abc-123')
    })
  })

  describe('create', () => {
    it('clona a voz, persiste e gera o preview (happy path)', async () => {
      repository.create.mockResolvedValue(mockVoice as any)

      const result = await service.create(tenantId, 'Comercial João', validSample)

      expect(voiceCloning.cloneVoice).toHaveBeenCalledWith(
        'tenant-123:Comercial João',
        [expect.objectContaining({ filename: 'voz.mp3', mimetype: 'audio/mpeg' })],
      )
      expect(repository.create).toHaveBeenCalledWith({
        tenantId,
        name: 'Comercial João',
        externalVoiceId: 'el-abc-123',
      })
      expect(storage.uploadRaw).toHaveBeenCalledWith(
        'voice-previews/clyvoiceabc.mp3',
        expect.any(Buffer),
        'audio/mpeg',
      )
      expect(repository.setPreviewKey).toHaveBeenCalledWith(
        'clyvoiceabc',
        'voice-previews/clyvoiceabc.mp3',
      )
      expect(result.data.id).toBe('clyvoiceabc')
    })

    it('persiste a voz mesmo se a geração do preview falhar', async () => {
      repository.create.mockResolvedValue(mockVoice as any)
      tts.synthesize.mockRejectedValue(new Error('tts down'))

      const result = await service.create(tenantId, 'Comercial João', validSample)

      expect(result.data.id).toBe('clyvoiceabc')
      expect(repository.setPreviewKey).not.toHaveBeenCalled()
    })

    it('lança AI_ELEVENLABS_NOT_CONFIGURED quando não há API key', async () => {
      voiceCloning.isConfigured.mockReturnValue(false)

      await expect(service.create(tenantId, 'x', validSample)).rejects.toMatchObject({
        code: 'AI_ELEVENLABS_NOT_CONFIGURED',
      })
      expect(voiceCloning.cloneVoice).not.toHaveBeenCalled()
    })

    it('lança AI_VOICE_SAMPLE_INVALID para mimetype não suportado', async () => {
      await expect(
        service.create(tenantId, 'x', { ...validSample, mimetype: 'application/pdf' }),
      ).rejects.toMatchObject({ code: 'AI_VOICE_SAMPLE_INVALID' })
    })

    it('aceita áudio do WhatsApp (ogg/opus) sem conversão e normaliza o mimetype', async () => {
      repository.create.mockResolvedValue(mockVoice as any)

      await service.create(tenantId, 'Zap', {
        ...validSample,
        filename: 'ptt.ogg',
        mimetype: 'audio/ogg; codecs=opus',
      })

      expect(voiceCloning.cloneVoice).toHaveBeenCalledWith('tenant-123:Zap', [
        expect.objectContaining({ mimetype: 'audio/ogg' }),
      ])
    })

    it('lança AI_VOICE_SAMPLE_INVALID para amostra acima de 10MB', async () => {
      await expect(
        service.create(tenantId, 'x', { ...validSample, buffer: Buffer.alloc(11 * 1024 * 1024) }),
      ).rejects.toMatchObject({ code: 'AI_VOICE_SAMPLE_INVALID' })
    })

    it('mapeia limite de vozes do provider para AI_VOICE_LIMIT_REACHED', async () => {
      voiceCloning.cloneVoice.mockRejectedValue(
        new VoiceCloningError('limit', 'limit_reached'),
      )

      await expect(service.create(tenantId, 'x', validSample)).rejects.toMatchObject({
        code: 'AI_VOICE_LIMIT_REACHED',
      })
      expect(repository.create).not.toHaveBeenCalled()
    })

    it('mapeia erro genérico de clonagem para AI_VOICE_CLONE_FAILED', async () => {
      voiceCloning.cloneVoice.mockRejectedValue(new VoiceCloningError('boom', 'failed'))

      await expect(service.create(tenantId, 'x', validSample)).rejects.toMatchObject({
        code: 'AI_VOICE_CLONE_FAILED',
      })
    })
  })

  describe('remove', () => {
    it('remove na ElevenLabs, apaga o preview e faz soft delete', async () => {
      repository.findById.mockResolvedValue({
        ...mockVoice,
        previewKey: 'voice-previews/clyvoiceabc.mp3',
      } as any)
      repository.softDelete.mockResolvedValue({ count: 1 } as any)

      const result = await service.remove(tenantId, 'clyvoiceabc')

      expect(voiceCloning.deleteVoice).toHaveBeenCalledWith('el-abc-123')
      expect(storage.delete).toHaveBeenCalledWith('voice-previews/clyvoiceabc.mp3')
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'clyvoiceabc')
      expect(result.data.deleted).toBe(true)
    })

    it('lança AI_VOICE_NOT_FOUND quando a voz não é do tenant', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(service.remove(tenantId, 'outra')).rejects.toMatchObject({
        code: 'AI_VOICE_NOT_FOUND',
      })
      expect(voiceCloning.deleteVoice).not.toHaveBeenCalled()
    })

    it('faz soft delete mesmo se a remoção na ElevenLabs falhar', async () => {
      repository.findById.mockResolvedValue(mockVoice as any)
      repository.softDelete.mockResolvedValue({ count: 1 } as any)
      voiceCloning.deleteVoice.mockRejectedValue(new Error('network'))

      const result = await service.remove(tenantId, 'clyvoiceabc')

      expect(repository.softDelete).toHaveBeenCalled()
      expect(result.data.deleted).toBe(true)
    })
  })

  describe('resolveForTts', () => {
    it('resolve voz built-in do Edge sem consultar o banco', async () => {
      const result = await service.resolveForTts(tenantId, 'pt-BR-FranciscaNeural')

      expect(result).toEqual({ provider: 'edge', voiceId: 'pt-BR-FranciscaNeural' })
      expect(repository.findById).not.toHaveBeenCalled()
    })

    it('resolve voz customizada do tenant para ElevenLabs + externalVoiceId', async () => {
      repository.findById.mockResolvedValue(mockVoice as any)

      const result = await service.resolveForTts(tenantId, 'clyvoiceabc')

      expect(repository.findById).toHaveBeenCalledWith(tenantId, 'clyvoiceabc')
      expect(result).toEqual({ provider: 'elevenlabs', voiceId: 'el-abc-123' })
    })

    it('faz fallback para Edge quando o id não é uma voz do tenant (isolamento)', async () => {
      repository.findById.mockResolvedValue(null)

      const result = await service.resolveForTts(tenantId, 'clyvoiceDeOutroTenant')

      expect(result).toEqual({ provider: 'edge', voiceId: 'clyvoiceDeOutroTenant' })
    })

    it('usa a voz padrão quando voiceId é nulo', async () => {
      const result = await service.resolveForTts(tenantId, null)

      expect(result).toEqual({ provider: 'edge', voiceId: 'pt-BR-FranciscaNeural' })
    })
  })
})
