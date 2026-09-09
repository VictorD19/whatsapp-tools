export interface VoiceSample {
  buffer: Buffer
  filename: string
  mimetype: string
}

export interface ClonedVoice {
  /** Provider-specific voice id, to be used later as TTSOptions.voiceId */
  externalVoiceId: string
}

export type VoiceCloningErrorReason =
  | 'not_configured'
  | 'limit_reached'
  | 'invalid_sample'
  | 'failed'

/** Domain error thrown by voice-cloning adapters; keeps provider specifics out of callers. */
export class VoiceCloningError extends Error {
  constructor(
    message: string,
    public readonly reason: VoiceCloningErrorReason,
  ) {
    super(message)
    this.name = 'VoiceCloningError'
  }
}

/**
 * Port for providers capable of cloning a voice from an audio sample.
 * Kept separate from ITextToSpeechProvider because not every TTS backend
 * supports cloning (Edge TTS does not).
 */
export interface IVoiceCloningProvider {
  /** Whether the provider has the config it needs (e.g. API key) to operate. */
  isConfigured(): boolean
  cloneVoice(name: string, samples: VoiceSample[]): Promise<ClonedVoice>
  deleteVoice(externalVoiceId: string): Promise<void>
}
