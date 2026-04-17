import { Injectable } from '@nestjs/common'
import type {
  ICalendarProvider,
  CalendarEventInput,
  CalendarEventResult,
  FreeSlot,
  WorkingHoursConfig,
  TokenResult,
} from '../../ports/calendar-provider.interface'

@Injectable()
export class GoogleCalendarAdapter implements ICalendarProvider {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3'

  async createEvent(accessToken: string, input: CalendarEventInput): Promise<CalendarEventResult> {
    const body: Record<string, any> = {
      summary: input.title,
      start: { dateTime: input.startAt.toISOString(), timeZone: input.timezone },
      end: { dateTime: input.endAt.toISOString(), timeZone: input.timezone },
    }

    if (input.description) body.description = input.description
    if (input.location) body.location = input.location
    if (input.attendees?.length) {
      body.attendees = input.attendees.map((a) => ({ email: a.email, displayName: a.name }))
    }
    if (input.createMeetLink) {
      body.conferenceData = { createRequest: { requestId: `meet-${Date.now()}` } }
    }

    const response = await fetch(`${this.baseUrl}/calendars/primary/events${input.createMeetLink ? '?conferenceDataVersion=1' : ''}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google Calendar create event failed: ${response.status} ${error}`)
    }

    const data = await response.json() as any
    return {
      eventId: data.id,
      hangoutLink: data.hangoutLink ?? undefined,
      htmlLink: data.htmlLink,
      status: data.status,
    }
  }

  async listEvents(accessToken: string, from: Date, to: Date): Promise<CalendarEventResult[]> {
    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    const response = await fetch(`${this.baseUrl}/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`Google Calendar list events failed: ${response.status}`)
    }

    const data = await response.json() as any
    return (data.items ?? []).map((item: any) => ({
      eventId: item.id,
      htmlLink: item.htmlLink,
      hangoutLink: item.hangoutLink ?? undefined,
      status: item.status,
    }))
  }

  async getFreeSlots(
    accessToken: string,
    from: Date,
    to: Date,
    slotDurationMinutes: number,
    workingHours: WorkingHoursConfig,
  ): Promise<FreeSlot[]> {
    const params = new URLSearchParams({
      timeMin: from.toISOString(),
      timeMax: to.toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    })

    const response = await fetch(`${this.baseUrl}/calendars/primary/events?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10_000),
    })

    if (!response.ok) {
      throw new Error(`Google Calendar get events failed: ${response.status}`)
    }

    const data = await response.json() as any
    const busySlots: { start: Date; end: Date }[] = (data.items ?? []).map((item: any) => ({
      start: new Date(item.start.dateTime ?? item.start.date),
      end: new Date(item.end.dateTime ?? item.end.date),
    }))

    return this.calculateFreeSlots(from, to, slotDurationMinutes, workingHours, busySlots)
  }

  async refreshToken(refreshToken: string): Promise<TokenResult> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.status}`)
    }

    const data = await response.json() as any
    return { accessToken: data.access_token, expiresIn: data.expires_in }
  }

  private calculateFreeSlots(
    from: Date,
    to: Date,
    durationMinutes: number,
    workingHours: WorkingHoursConfig,
    busySlots: { start: Date; end: Date }[],
  ): FreeSlot[] {
    const freeSlots: FreeSlot[] = []
    const [whStartH, whStartM] = workingHours.start.split(':').map(Number)
    const [whEndH, whEndM] = workingHours.end.split(':').map(Number)

    const current = new Date(from)
    while (current < to) {
      const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay()
      if (!workingHours.workingDays.includes(dayOfWeek)) {
        current.setDate(current.getDate() + 1)
        current.setHours(0, 0, 0, 0)
        continue
      }

      const slotStart = new Date(current)
      slotStart.setHours(whStartH, whStartM, 0, 0)
      const dayEnd = new Date(current)
      dayEnd.setHours(whEndH, whEndM, 0, 0)

      while (slotStart < dayEnd) {
        const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60_000)
        if (slotEnd > dayEnd) break

        const isBusy = busySlots.some(
          (busy) => slotStart < busy.end && slotEnd > busy.start,
        )
        if (!isBusy) {
          freeSlots.push({ startAt: new Date(slotStart), endAt: new Date(slotEnd) })
        }
        slotStart.setTime(slotStart.getTime() + durationMinutes * 60_000)
      }

      current.setDate(current.getDate() + 1)
      current.setHours(0, 0, 0, 0)
    }

    return freeSlots
  }
}
