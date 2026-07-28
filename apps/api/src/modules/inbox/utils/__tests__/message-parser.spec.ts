import { extractCtwaClid, extractAdAttribution, parseWhatsAppMessage } from '../message-parser'

describe('extractCtwaClid', () => {
  it('should extract ctwaClid from extendedTextMessage.contextInfo.externalAdReplyInfo', () => {
    const message = {
      extendedTextMessage: {
        text: 'Olá, vi o anúncio',
        contextInfo: {
          externalAdReplyInfo: {
            ctwaClid: 'ARAkLk...clid',
            sourceId: 'ad-123',
          },
        },
      },
    }

    expect(extractCtwaClid(message)).toBe('ARAkLk...clid')
  })

  it('should extract ctwaClid from imageMessage.contextInfo.externalAdReplyInfo', () => {
    const message = {
      imageMessage: {
        caption: 'Foto',
        contextInfo: {
          externalAdReplyInfo: { ctwaClid: 'clid-from-image' },
        },
      },
    }

    expect(extractCtwaClid(message)).toBe('clid-from-image')
  })

  it('should unwrap ephemeralMessage before extracting', () => {
    const message = {
      ephemeralMessage: {
        message: {
          extendedTextMessage: {
            contextInfo: {
              externalAdReplyInfo: { ctwaClid: 'clid-from-ephemeral' },
            },
          },
        },
      },
    }

    expect(extractCtwaClid(message)).toBe('clid-from-ephemeral')
  })

  it('should return undefined for plain text messages without ad context', () => {
    const message = { conversation: 'Oi, tudo bem?' }

    expect(extractCtwaClid(message)).toBeUndefined()
  })

  it('should return undefined when contextInfo has no externalAdReplyInfo', () => {
    const message = {
      extendedTextMessage: {
        text: 'Respondendo a mensagem',
        contextInfo: { stanzaId: 'ABC123' },
      },
    }

    expect(extractCtwaClid(message)).toBeUndefined()
  })

  it('should return undefined for undefined message', () => {
    expect(extractCtwaClid(undefined)).toBeUndefined()
  })
})

describe('extractAdAttribution', () => {
  it('should extract ctwaClid, sourceId, title and sourceUrl from externalAdReplyInfo', () => {
    const message = {
      extendedTextMessage: {
        text: 'Olá, vi o anúncio',
        contextInfo: {
          externalAdReplyInfo: {
            ctwaClid: 'ARAkLk...clid',
            sourceId: 'ad-123',
            title: 'Promoção de verão',
            sourceUrl: 'https://fb.me/ad-123',
          },
        },
      },
    }

    expect(extractAdAttribution(message)).toEqual({
      ctwaClid: 'ARAkLk...clid',
      sourceId: 'ad-123',
      title: 'Promoção de verão',
      sourceUrl: 'https://fb.me/ad-123',
    })
  })

  it('should extract partial attribution when only ctwaClid is present', () => {
    const message = {
      imageMessage: {
        contextInfo: {
          externalAdReplyInfo: { ctwaClid: 'clid-only' },
        },
      },
    }

    expect(extractAdAttribution(message)).toEqual({
      ctwaClid: 'clid-only',
      sourceId: undefined,
      title: undefined,
      sourceUrl: undefined,
    })
  })

  it('should unwrap ephemeralMessage before extracting', () => {
    const message = {
      ephemeralMessage: {
        message: {
          extendedTextMessage: {
            contextInfo: {
              externalAdReplyInfo: { ctwaClid: 'clid-from-ephemeral', title: 'Anúncio' },
            },
          },
        },
      },
    }

    expect(extractAdAttribution(message)).toEqual({
      ctwaClid: 'clid-from-ephemeral',
      sourceId: undefined,
      title: 'Anúncio',
      sourceUrl: undefined,
    })
  })

  it('should return undefined when there is no externalAdReplyInfo', () => {
    const message = { conversation: 'Oi, tudo bem?' }

    expect(extractAdAttribution(message)).toBeUndefined()
  })

  it('should return undefined for undefined message', () => {
    expect(extractAdAttribution(undefined)).toBeUndefined()
  })
})

describe('parseWhatsAppMessage — fileLength', () => {
  it('should extract fileLength as a plain number from documentMessage', () => {
    const message = {
      documentMessage: { fileName: 'contrato.pdf', fileLength: 1048576 },
    }

    expect(parseWhatsAppMessage(message).fileLength).toBe(1048576)
  })

  it('should extract fileLength from the Long-style object used by Baileys/Evolution ({low, high, unsigned})', () => {
    const message = {
      documentMessage: {
        fileName: 'arquivo-grande.3mf',
        fileLength: { low: 265381216, high: 0, unsigned: true },
      },
    }

    expect(parseWhatsAppMessage(message).fileLength).toBe(265381216)
  })

  it('should extract fileLength from imageMessage, videoMessage and audioMessage', () => {
    expect(parseWhatsAppMessage({ imageMessage: { fileLength: 2048 } }).fileLength).toBe(2048)
    expect(parseWhatsAppMessage({ videoMessage: { fileLength: 4096 } }).fileLength).toBe(4096)
    expect(parseWhatsAppMessage({ audioMessage: { fileLength: 8192 } }).fileLength).toBe(8192)
  })

  it('should return undefined fileLength when not present in the payload', () => {
    const message = { documentMessage: { fileName: 'sem-tamanho.pdf' } }

    expect(parseWhatsAppMessage(message).fileLength).toBeUndefined()
  })

  it('should return undefined fileLength for text messages', () => {
    expect(parseWhatsAppMessage({ conversation: 'Oi' }).fileLength).toBeUndefined()
  })
})
