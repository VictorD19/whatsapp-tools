import { GoogleCalendarAdapter } from '../adapters/google/google-calendar.adapter'
import type { ICalendarProvider } from '../ports/calendar-provider.interface'

describe('GoogleCalendarAdapter', () => {
  let adapter: ICalendarProvider

  beforeEach(() => {
    adapter = new GoogleCalendarAdapter()
  })

  describe('createEvent', () => {
    it('should create event via Google Calendar API', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          id: 'evt-1',
          htmlLink: 'https://calendar.google.com/event?eid=xxx',
          hangoutLink: 'https://meet.google.com/abc',
          status: 'confirmed',
        }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as any

      const result = await adapter.createEvent('access-token', {
        title: 'Reunião com João',
        startAt: new Date('2026-04-17T14:00:00'),
        endAt: new Date('2026-04-17T15:00:00'),
        timezone: 'America/Sao_Paulo',
        attendees: [{ email: 'joao@email.com', name: 'João' }],
        createMeetLink: true,
      })

      expect(result.eventId).toBe('evt-1')
      expect(result.hangoutLink).toBe('https://meet.google.com/abc')
      expect(result.htmlLink).toContain('calendar.google.com')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('calendar/v3/calendars/primary/events'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
        }),
      )
    })

    it('should throw on API error', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        text: jest.fn().mockResolvedValue('Unauthorized'),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as any

      await expect(
        adapter.createEvent('bad-token', {
          title: 'Test',
          startAt: new Date(),
          endAt: new Date(),
          timezone: 'America/Sao_Paulo',
        }),
      ).rejects.toThrow()
    })
  })

  describe('getFreeSlots', () => {
    it('should return free slots based on working hours config', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [{
            start: { dateTime: '2026-04-17T10:00:00-03:00' },
            end: { dateTime: '2026-04-17T11:00:00-03:00' },
          }],
        }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as any

      const result = await adapter.getFreeSlots(
        'access-token',
        new Date('2026-04-17T00:00:00-03:00'),
        new Date('2026-04-17T23:59:59-03:00'),
        60,
        { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
      )

      expect(result.length).toBeGreaterThan(0)
      const overlap = result.find(
        (s) => s.startAt < new Date('2026-04-17T11:00:00-03:00') && s.endAt > new Date('2026-04-17T10:00:00-03:00'),
      )
      expect(overlap).toBeUndefined()
    })

    it('should return full day slots when no events exist', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ items: [] }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as any

      const result = await adapter.getFreeSlots(
        'access-token',
        new Date('2026-04-17T00:00:00-03:00'),
        new Date('2026-04-17T23:59:59-03:00'),
        60,
        { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
      )

      expect(result).toHaveLength(10)
    })
  })

  describe('refreshToken', () => {
    it('should call Google token endpoint with refresh token', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: 'new-access-token',
          expires_in: 3600,
        }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse) as any

      const result = await adapter.refreshToken('refresh-token-value')

      expect(result.accessToken).toBe('new-access-token')
      expect(result.expiresIn).toBe(3600)
    })
  })
})
