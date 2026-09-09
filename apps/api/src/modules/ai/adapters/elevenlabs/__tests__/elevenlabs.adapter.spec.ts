import { ElevenLabsAdapter } from '../elevenlabs.adapter'
import { ElevenLabsApiError } from '../elevenlabs-http.client'
import { VoiceCloningError } from '../../../ports/voice-cloning.interface'

describe('ElevenLabsAdapter', () => {
  let http: {
    isConfigured: jest.Mock
    textToSpeech: jest.Mock
    addVoice: jest.Mock
    deleteVoice: jest.Mock
  }
  let adapter: ElevenLabsAdapter

  beforeEach(() => {
    http = {
      isConfigured: jest.fn().mockReturnValue(true),
      textToSpeech: jest.fn(),
      addVoice: jest.fn(),
      deleteVoice: jest.fn(),
    }
    adapter = new ElevenLabsAdapter(http as any)
  })

  describe('synthesize', () => {
    it('retorna o áudio como audio/mpeg no happy path', async () => {
      http.textToSpeech.mockResolvedValue(Buffer.from('audio'))

      const result = await adapter.synthesize('olá', { voiceId: 'v1' })

      expect(http.textToSpeech).toHaveBeenCalledWith('v1', 'olá')
      expect(result).toEqual({ audioBuffer: Buffer.from('audio'), mimetype: 'audio/mpeg' })
    })

    it('exige voiceId', async () => {
      await expect(adapter.synthesize('oi')).rejects.toThrow(/voiceId/)
    })

    it('abre o circuit breaker após 5 falhas consecutivas', async () => {
      http.textToSpeech.mockRejectedValue(new Error('500'))

      for (let i = 0; i < 5; i++) {
        await expect(adapter.synthesize('x', { voiceId: 'v1' })).rejects.toThrow()
      }

      await expect(adapter.synthesize('x', { voiceId: 'v1' })).rejects.toThrow(/circuit breaker/)
      // A 6ª chamada nem chega ao http client
      expect(http.textToSpeech).toHaveBeenCalledTimes(5)
    })

    it('reseta o contador de falhas após um sucesso', async () => {
      http.textToSpeech
        .mockRejectedValueOnce(new Error('500'))
        .mockRejectedValueOnce(new Error('500'))
        .mockResolvedValueOnce(Buffer.from('ok'))
        .mockRejectedValue(new Error('500'))

      await expect(adapter.synthesize('x', { voiceId: 'v1' })).rejects.toThrow()
      await expect(adapter.synthesize('x', { voiceId: 'v1' })).rejects.toThrow()
      await adapter.synthesize('x', { voiceId: 'v1' })

      for (let i = 0; i < 4; i++) {
        await expect(adapter.synthesize('x', { voiceId: 'v1' })).rejects.toThrow(/500/)
      }
    })
  })

  describe('cloneVoice', () => {
    it('retorna o externalVoiceId no happy path', async () => {
      http.addVoice.mockResolvedValue('el-999')

      const result = await adapter.cloneVoice('nome', [
        { buffer: Buffer.alloc(1), filename: 'a.mp3', mimetype: 'audio/mpeg' },
      ])

      expect(result).toEqual({ externalVoiceId: 'el-999' })
    })

    it('converte erro de limite em VoiceCloningError(limit_reached)', async () => {
      http.addVoice.mockRejectedValue(
        new ElevenLabsApiError('limit', 400, 'voice_limit_reached'),
      )

      await expect(adapter.cloneVoice('n', [])).rejects.toMatchObject({
        name: 'VoiceCloningError',
        reason: 'limit_reached',
      })
    })

    it('converte 422 em VoiceCloningError(invalid_sample)', async () => {
      http.addVoice.mockRejectedValue(new ElevenLabsApiError('bad', 422))

      await expect(adapter.cloneVoice('n', [])).rejects.toMatchObject({ reason: 'invalid_sample' })
    })

    it('converte erro desconhecido em VoiceCloningError(failed)', async () => {
      http.addVoice.mockRejectedValue(new Error('network'))

      const err = await adapter.cloneVoice('n', []).catch((e) => e)
      expect(err).toBeInstanceOf(VoiceCloningError)
      expect(err.reason).toBe('failed')
    })
  })

  describe('deleteVoice', () => {
    it('delega para o http client', async () => {
      http.deleteVoice.mockResolvedValue(undefined)
      await adapter.deleteVoice('el-1')
      expect(http.deleteVoice).toHaveBeenCalledWith('el-1')
    })
  })
})
