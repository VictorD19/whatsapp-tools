import { MetaGraphAdapter } from '../meta-graph.adapter'
import * as crypto from 'crypto'

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex')
}

describe('MetaGraphAdapter', () => {
  let adapter: MetaGraphAdapter
  let fetchMock: jest.Mock

  beforeEach(() => {
    adapter = new MetaGraphAdapter()
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({ events_received: 1, fbtrace_id: 'trace-1' }),
    })
    global.fetch = fetchMock as unknown as typeof fetch
  })

  it('should hash the phone as digits-only with country code, no "+"', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', {
      eventName: 'Lead',
      phone: '(11) 99999-9999',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    const userData = body.data[0].user_data

    expect(userData.ph).toEqual([sha256('5511999999999')])
  })

  it('should not double the country code when phone already includes it', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', {
      eventName: 'Lead',
      phone: '5511999999999',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[0].user_data.ph).toEqual([sha256('5511999999999')])
  })

  it('should send ctwa_clid unhashed in user_data', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', {
      eventName: 'Lead',
      ctwaClid: 'ARAkLk...clid',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[0].user_data.ctwa_clid).toBe('ARAkLk...clid')
  })

  it('should omit ctwa_clid when not provided', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', { eventName: 'Lead' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[0].user_data.ctwa_clid).toBeUndefined()
  })

  it('should include messaging_channel=whatsapp for business_messaging events', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', {
      eventName: 'Lead',
      actionSource: 'business_messaging',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[0].messaging_channel).toBe('whatsapp')
  })

  it('should default action_source to business_messaging and include messaging_channel', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', { eventName: 'Lead' })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[0].action_source).toBe('business_messaging')
    expect(body.data[0].messaging_channel).toBe('whatsapp')
  })

  it('should not include messaging_channel for non business_messaging action sources', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', {
      eventName: 'Lead',
      actionSource: 'system_generated',
    })

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.data[0].messaging_channel).toBeUndefined()
  })

  it('should include test_event_code when provided', async () => {
    await adapter.sendEvent('pixel-1', 'token-1', { eventName: 'Lead' }, 'TEST123')

    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.test_event_code).toBe('TEST123')
  })

  it('should throw when the Graph API returns an error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      json: jest.fn().mockResolvedValue({ error: { message: 'Invalid access token', code: 190 } }),
    })

    await expect(
      adapter.sendEvent('pixel-1', 'bad-token', { eventName: 'Lead' }),
    ).rejects.toThrow('Invalid access token')
  })
})
