import { TtsRouterService } from '../tts-router.service'

describe('TtsRouterService', () => {
  let edge: { synthesize: jest.Mock }
  let elevenLabs: { synthesize: jest.Mock }
  let router: TtsRouterService

  beforeEach(() => {
    edge = { synthesize: jest.fn().mockResolvedValue({ audioBuffer: Buffer.from('edge'), mimetype: 'audio/mpeg' }) }
    elevenLabs = { synthesize: jest.fn().mockResolvedValue({ audioBuffer: Buffer.from('el'), mimetype: 'audio/mpeg' }) }
    router = new TtsRouterService(edge as any, elevenLabs as any)
  })

  it('roteia para Edge quando provider é "edge"', async () => {
    await router.synthesize('oi', { provider: 'edge', voiceId: 'pt-BR-FranciscaNeural' })

    expect(edge.synthesize).toHaveBeenCalled()
    expect(elevenLabs.synthesize).not.toHaveBeenCalled()
  })

  it('roteia para Edge por padrão (sem provider)', async () => {
    await router.synthesize('oi')

    expect(edge.synthesize).toHaveBeenCalled()
    expect(elevenLabs.synthesize).not.toHaveBeenCalled()
  })

  it('roteia para ElevenLabs quando provider é "elevenlabs"', async () => {
    await router.synthesize('oi', { provider: 'elevenlabs', voiceId: 'el-1' })

    expect(elevenLabs.synthesize).toHaveBeenCalledWith('oi', { provider: 'elevenlabs', voiceId: 'el-1' })
    expect(edge.synthesize).not.toHaveBeenCalled()
  })
})
