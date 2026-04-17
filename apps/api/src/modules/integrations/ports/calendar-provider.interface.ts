export interface WorkingHoursConfig {
  start: string // "08:00"
  end: string // "18:00"
  workingDays: number[] // [1,2,3,4,5] = Mon-Fri
}

export interface CalendarEventInput {
  title: string
  description?: string
  startAt: Date
  endAt: Date
  timezone: string
  location?: string
  attendees?: { email: string; name?: string }[]
  createMeetLink?: boolean
}

export interface CalendarEventResult {
  eventId: string
  hangoutLink?: string
  htmlLink: string
  status: string
}

export interface FreeSlot {
  startAt: Date
  endAt: Date
}

export interface TokenResult {
  accessToken: string
  expiresIn: number
  refreshToken?: string
}

export interface ICalendarProvider {
  createEvent(
    accessToken: string,
    input: CalendarEventInput,
  ): Promise<CalendarEventResult>
  listEvents(
    accessToken: string,
    from: Date,
    to: Date,
  ): Promise<CalendarEventResult[]>
  getFreeSlots(
    accessToken: string,
    from: Date,
    to: Date,
    slotDurationMinutes: number,
    workingHours: WorkingHoursConfig,
  ): Promise<FreeSlot[]>
  refreshToken(refreshToken: string): Promise<TokenResult>
}
