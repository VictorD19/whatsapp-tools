export interface ITextToSpeechProvider {
  synthesize(text: string, options?: TTSOptions): Promise<TTSResult>
}

export interface TTSOptions {
  /** Voice identifier (default: 'pt-BR-FranciscaNeural') */
  voiceId?: string
  /** Speech speed multiplier (default: 1.0) */
  speed?: number
  /** Output audio format (default: 'audio/mpeg') */
  format?: string
}

export interface TTSResult {
  audioBuffer: Buffer
  mimetype: string
  /** Duration of the generated audio in seconds */
  duration?: number
}
