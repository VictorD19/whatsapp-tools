export interface ISpeechToTextProvider {
  transcribe(audioBuffer: Buffer, options?: STTOptions): Promise<STTResult>
}

export interface STTOptions {
  /** Language code (default: 'pt') */
  language?: string
  /** Model override (default: provider decides) */
  model?: string
}

export interface STTResult {
  text: string
  language: string
  /** Duration of the audio in seconds */
  duration?: number
}
