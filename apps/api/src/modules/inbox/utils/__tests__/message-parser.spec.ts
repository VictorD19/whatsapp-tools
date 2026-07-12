import { extractCtwaClid } from '../message-parser'

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
