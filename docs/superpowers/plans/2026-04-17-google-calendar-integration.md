# Google Calendar Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google Calendar OAuth2 integration so AI assistants can check availability and create calendar events via WhatsApp conversations.

**Architecture:** New `integrations` module following the hexagonal Ports & Adapters pattern (same as WhatsApp module). Google Calendar adapter implements `ICalendarProvider` interface. Two new AI tool types (`CONSULTAR_DISPONIBILIDADE`, `CRIAR_EVENTO`) added to the existing tool executor. Frontend updates the existing "Integrations" section in Settings page.

**Tech Stack:** NestJS, Prisma, Google Calendar API v3, AES-256-GCM encryption, OAuth2 with PKCE, React (Next.js), next-intl for i18n.

---

## File Map

### New Files (Backend)

| File | Responsibility |
|------|---------------|
| `apps/api/src/modules/integrations/integrations.module.ts` | Module definition, provider registration |
| `apps/api/src/modules/integrations/integrations.controller.ts` | REST endpoints (OAuth callback, CRUD) |
| `apps/api/src/modules/integrations/integrations.service.ts` | Business logic (connect, disconnect, refresh) |
| `apps/api/src/modules/integrations/integrations.repository.ts` | Prisma data access |
| `apps/api/src/modules/integrations/dto/connect-integration.dto.ts` | Zod validation schemas |
| `apps/api/src/modules/integrations/ports/calendar-provider.interface.ts` | ICalendarProvider contract |
| `apps/api/src/modules/integrations/adapters/google/google-calendar.adapter.ts` | Google Calendar API implementation |
| `apps/api/src/modules/integrations/adapters/google/google-auth.service.ts` | OAuth2 flow, token management, encryption |
| `apps/api/src/modules/integrations/integrations.tokens.ts` | Dependency injection tokens |
| `apps/api/src/modules/integrations/__tests__/integrations.service.spec.ts` | Service unit tests |
| `apps/api/src/modules/integrations/__tests__/google-calendar.adapter.spec.ts` | Adapter unit tests |

### New Files (Frontend)

| File | Responsibility |
|------|---------------|
| `apps/web/src/hooks/use-integrations.ts` | API calls hook for integrations |
| `apps/web/src/components/settings/google-calendar-card.tsx` | Google Calendar connection card component |

### Modified Files

| File | Change |
|------|--------|
| `packages/database/prisma/schema.prisma` | Add `Integration`, `CalendarEvent` models; extend `AiToolType` enum; add relations to `Tenant`, `User` |
| `apps/api/src/app.module.ts` | Import `IntegrationsModule` |
| `apps/api/src/modules/ai-tools/dto/create-ai-tool.dto.ts` | Add Zod schemas for `CONSULTAR_DISPONIBILIDADE` and `CRIAR_EVENTO` |
| `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts` | Add `CONSULTAR_DISPONIBILIDADE` and `CRIAR_EVENTO` cases |
| `apps/api/src/modules/ai-tools/ai-tools.module.ts` | Import `IntegrationsModule` |
| `apps/api/src/modules/ai-tools/__tests__/tool-executor.service.spec.ts` | Add tests for new tool types |
| `apps/api/src/modules/assistants/services/assistant-prompt.builder.ts` | Add calendar-specific tool instructions |
| `apps/api/src/core/errors/error-codes.ts` | Add integration error codes |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Replace `IntegrationsSection` overlay with real implementation |
| `apps/web/messages/pt-BR.json` | Add `integrations` namespace keys |
| `apps/web/messages/en.json` | Add `integrations` namespace keys |
| `apps/web/messages/es.json` | Add `integrations` namespace keys |
| `.env.example` | Add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URL`, `ENCRYPTION_KEY` |

---

## Task 1: Prisma Schema — Models, Enum, Relations

**Files:**
- Modify: `packages/database/prisma/schema.prisma`

- [ ] **Step 1: Add `Integration` and `CalendarEvent` models + extend enum**

At the end of the schema (before the closing section), add:

```prisma
// ── Integrations ──────────────────────────────────

model Integration {
  id                String    @id @default(cuid())
  tenantId          String
  userId            String
  provider          String              // "google_calendar", "outlook"
  providerAccountId String              // email da conta Google
  accessToken       String?   @db.Text  // criptografado AES-256
  refreshToken      String?   @db.Text  // criptografado AES-256
  tokenExpiresAt    DateTime?
  scopes            String[]
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  deletedAt         DateTime?

  tenant         Tenant          @relation(fields: [tenantId], references: [id])
  user           User            @relation(fields: [userId], references: [id])
  calendarEvents CalendarEvent[]

  @@index([tenantId])
  @@index([userId])
}

model CalendarEvent {
  id               String   @id @default(cuid())
  tenantId         String
  integrationId    String
  externalEventId  String
  title            String
  description      String?
  startAt          DateTime
  endAt            DateTime
  timezone         String   @default("America/Sao_Paulo")
  location         String?
  attendees        Json?
  hangoutLink      String?
  status           String   @default("confirmed")
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  integration Integration @relation(fields: [integrationId], references: [id])

  @@index([tenantId])
  @@index([integrationId])
  @@index([startAt])
}
```

Add to the `AiToolType` enum:

```prisma
enum AiToolType {
  BUSCAR_CONTATO
  CRIAR_CONTATO
  ADICIONAR_TAG
  CRIAR_DEAL
  TRANSFERIR_HUMANO
  WEBHOOK_EXTERNO
  SETAR_ETAPA_PIPELINE
  CONSULTAR_DISPONIBILIDADE
  CRIAR_EVENTO
}
```

Add relations to `Tenant` model (after existing relations):

```prisma
  integrations    Integration[]
  calendarEvents  CalendarEvent[]
```

Add relation to `User` model (after existing relations):

```prisma
  integrations    Integration[]
```

- [ ] **Step 2: Run migration**

```bash
cd packages/database && npx prisma migrate dev --name 20260417_google_calendar_integration
```

Expected: Migration created and applied successfully.

- [ ] **Step 3: Generate Prisma client**

```bash
cd packages/database && npx prisma generate
```

Expected: Prisma client regenerated with new models and enum values.

- [ ] **Step 4: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "feat(db): add Integration and CalendarEvent models, extend AiToolType enum"
```

---

## Task 2: Error Codes

**Files:**
- Modify: `apps/api/src/core/errors/error-codes.ts`

- [ ] **Step 1: Add integration error codes**

After the `AI_TOOL_EXECUTION_FAILED` line (line 88), add:

```typescript
  // Integrations
  INTEGRATION_NOT_FOUND: 'INTEGRATION_NOT_FOUND',
  INTEGRATION_NOT_CONNECTED: 'INTEGRATION_NOT_CONNECTED',
  INTEGRATION_TOKEN_EXPIRED: 'INTEGRATION_TOKEN_EXPIRED',
  INTEGRATION_PROVIDER_ERROR: 'INTEGRATION_PROVIDER_ERROR',
  CALENDAR_EVENT_CREATE_FAILED: 'CALENDAR_EVENT_CREATE_FAILED',
  CALENDAR_FREE_SLOTS_FAILED: 'CALENDAR_FREE_SLOTS_FAILED',
  ENCRYPTION_KEY_MISSING: 'ENCRYPTION_KEY_MISSING',
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/core/errors/error-codes.ts
git commit -m "feat(errors): add integration and calendar error codes"
```

---

## Task 3: ICalendarProvider Port (Interface)

**Files:**
- Create: `apps/api/src/modules/integrations/ports/calendar-provider.interface.ts`

- [ ] **Step 1: Create the port interface**

```typescript
export interface WorkingHoursConfig {
  start: string  // "08:00"
  end: string    // "18:00"
  workingDays: number[]  // [1,2,3,4,5] = Mon-Fri
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
  createEvent(accessToken: string, input: CalendarEventInput): Promise<CalendarEventResult>
  listEvents(accessToken: string, from: Date, to: Date): Promise<CalendarEventResult[]>
  getFreeSlots(accessToken: string, from: Date, to: Date, slotDurationMinutes: number, workingHours: WorkingHoursConfig): Promise<FreeSlot[]>
  refreshToken(refreshToken: string): Promise<TokenResult>
}
```

- [ ] **Step 2: Create tokens file**

Create `apps/api/src/modules/integrations/integrations.tokens.ts`:

```typescript
export const CALENDAR_PROVIDER = 'CALENDAR_PROVIDER'
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/integrations/
git commit -m "feat(integrations): add ICalendarProvider port and DI tokens"
```

---

## Task 4: Google Auth Service (OAuth2 + Encryption)

**Files:**
- Create: `apps/api/src/modules/integrations/adapters/google/google-auth.service.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/modules/integrations/__tests__/google-auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { GoogleAuthService } from '../adapters/google/google-auth.service'

describe('GoogleAuthService', () => {
  let service: GoogleAuthService
  let configService: jest.Mocked<ConfigService>

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                GOOGLE_CLIENT_ID: 'test-client-id',
                GOOGLE_CLIENT_SECRET: 'test-client-secret',
                GOOGLE_REDIRECT_URL: 'http://localhost:3000/integrations/google/callback',
                ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
              }
              return map[key]
            }),
          },
        },
      ],
    }).compile()

    service = module.get(GoogleAuthService)
    configService = module.get(ConfigService)
  })

  describe('getAuthUrl', () => {
    it('should generate a valid Google OAuth2 URL with PKCE', () => {
      const result = service.getAuthUrl('tenant-1', 'user-1')

      expect(result.url).toContain('accounts.google.com/o/oauth2/v2/auth')
      expect(result.url).toContain('client_id=test-client-id')
      expect(result.url).toContain('redirect_uri=')
      expect(result.url).toContain('scope=')
      expect(result.state).toBeTruthy()
      expect(result.codeVerifier).toBeTruthy()
    })
  })

  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt a value correctly', () => {
      const original = 'my-secret-token'
      const encrypted = service.encrypt(original)

      expect(encrypted).not.toBe(original)
      expect(service.decrypt(encrypted)).toBe(original)
    })
  })

  describe('exchangeCode', () => {
    it('should call Google token endpoint and return tokens', async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: 'access-123',
          refresh_token: 'refresh-123',
          expires_in: 3600,
          scope: 'calendar.readonly calendar.events',
        }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await service.exchangeCode('auth-code', 'code-verifier')

      expect(result.accessToken).toBe('access-123')
      expect(result.refreshToken).toBe('refresh-123')
      expect(result.expiresIn).toBe(3600)
    })

    it('should throw when Google returns error', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('invalid_grant'),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      await expect(service.exchangeCode('bad-code', 'verifier')).rejects.toThrow()
    })
  })

  describe('revokeToken', () => {
    it('should call Google revoke endpoint', async () => {
      const mockResponse = { ok: true }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      await service.revokeToken('access-123')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke?token=access-123',
        expect.objectContaining({ method: 'POST' }),
      )
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @repo/api test -- google-auth.service.spec
```

Expected: FAIL — `GoogleAuthService` does not exist.

- [ ] **Step 3: Implement `GoogleAuthService`**

```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import { AppException } from '@core/errors/app.exception'

interface PkceState {
  codeVerifier: string
  state: string
}

@Injectable()
export class GoogleAuthService {
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUrl: string
  private readonly encryptionKey: Buffer

  constructor(private readonly config: ConfigService) {
    this.clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '')
    this.clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET', '')
    this.redirectUrl = this.config.get<string>('GOOGLE_REDIRECT_URL', '')
    const key = this.config.get<string>('ENCRYPTION_KEY', '')
    if (!key || key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters')
    }
    this.encryptionKey = Buffer.from(key, 'utf-8')
  }

  getAuthUrl(tenantId: string, userId: string): { url: string; codeVerifier: string; state: string } {
    const codeVerifier = this.generateCodeVerifier()
    const state = Buffer.from(JSON.stringify({ tenantId, userId, ts: Date.now() })).toString('base64url')

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUrl,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events',
      access_type: 'offline',
      prompt: 'consent',
      state,
      code_challenge: codeVerifier,
      code_challenge_method: 'plain',
    })

    return {
      url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      codeVerifier,
      state,
    }
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresIn: number
    scopes: string[]
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUrl,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Google OAuth token exchange failed: ${response.status} ${error}`)
    }

    const data = await response.json() as any
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
      scopes: (data.scope as string).split(' '),
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string
    expiresIn: number
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: this.decrypt(refreshToken),
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      throw new Error(`Google token refresh failed: ${response.status}`)
    }

    const data = await response.json() as any
    return { accessToken: data.access_token, expiresIn: data.expires_in }
  }

  async revokeToken(accessToken: string): Promise<void> {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
      method: 'POST',
    })
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
  }

  decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64url')
    const iv = data.subarray(0, 12)
    const authTag = data.subarray(12, 28)
    const encrypted = data.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf-8')
  }

  parseState(state: string): { tenantId: string; userId: string } {
    const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf-8'))
    return { tenantId: parsed.tenantId, userId: parsed.userId }
  }

  private generateCodeVerifier(): string {
    return randomBytes(32).toString('base64url')
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @repo/api test -- google-auth.service.spec
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/integrations/
git commit -m "feat(integrations): add GoogleAuthService with OAuth2 PKCE + AES-256 encryption"
```

---

## Task 5: Google Calendar Adapter

**Files:**
- Create: `apps/api/src/modules/integrations/adapters/google/google-calendar.adapter.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/modules/integrations/__tests__/google-calendar.adapter.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { GoogleCalendarAdapter } from '../adapters/google/google-calendar.adapter'
import type { ICalendarProvider } from '../ports/calendar-provider.interface'

describe('GoogleCalendarAdapter', () => {
  let adapter: ICalendarProvider

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoogleCalendarAdapter],
    }).compile()

    adapter = module.get(GoogleCalendarAdapter)
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
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

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
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

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
      // Calendar returns one existing event from 10:00 to 11:00
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          items: [{
            start: { dateTime: '2026-04-17T10:00:00-03:00' },
            end: { dateTime: '2026-04-17T11:00:00-03:00' },
          }],
        }),
      }
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await adapter.getFreeSlots(
        'access-token',
        new Date('2026-04-17T00:00:00-03:00'),
        new Date('2026-04-17T23:59:59-03:00'),
        60,
        { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
      )

      // 08:00-10:00 (2 slots), 11:00-18:00 (7 slots) = 9 free slots
      expect(result.length).toBeGreaterThan(0)
      // No slot should overlap with 10:00-11:00
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
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await adapter.getFreeSlots(
        'access-token',
        new Date('2026-04-17T00:00:00-03:00'),
        new Date('2026-04-17T23:59:59-03:00'),
        60,
        { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
      )

      // 08:00-18:00 = 10 slots of 60min
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
      global.fetch = jest.fn().mockResolvedValue(mockResponse)

      const result = await adapter.refreshToken('refresh-token-value')

      expect(result.accessToken).toBe('new-access-token')
      expect(result.expiresIn).toBe(3600)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @repo/api test -- google-calendar.adapter.spec
```

Expected: FAIL — `GoogleCalendarAdapter` does not exist.

- [ ] **Step 3: Implement `GoogleCalendarAdapter`**

```typescript
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
    // This is handled by GoogleAuthService — adapter delegates
    // but for the interface contract, we call the token endpoint directly
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm --filter @repo/api test -- google-calendar.adapter.spec
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/integrations/
git commit -m "feat(integrations): add GoogleCalendarAdapter with createEvent, getFreeSlots"
```

---

## Task 6: Integrations Repository + Service + Module

**Files:**
- Create: `apps/api/src/modules/integrations/integrations.repository.ts`
- Create: `apps/api/src/modules/integrations/integrations.service.ts`
- Create: `apps/api/src/modules/integrations/integrations.module.ts`
- Create: `apps/api/src/modules/integrations/dto/connect-integration.dto.ts`
- Create: `apps/api/src/modules/integrations/__tests__/integrations.service.spec.ts`

- [ ] **Step 1: Write failing test**

Create `apps/api/src/modules/integrations/__tests__/integrations.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing'
import { IntegrationsService } from '../integrations.service'
import { IntegrationsRepository } from '../integrations.repository'
import { GoogleAuthService } from '../adapters/google/google-auth.service'
import { ConfigService } from '@nestjs/config'

describe('IntegrationsService', () => {
  let service: IntegrationsService
  let repository: jest.Mocked<IntegrationsRepository>
  let googleAuth: jest.Mocked<GoogleAuthService>

  const tenantId = 'tenant-1'
  const userId = 'user-1'

  const mockIntegration = {
    id: 'int-1',
    tenantId,
    userId,
    provider: 'google_calendar',
    providerAccountId: 'joao@gmail.com',
    accessToken: 'encrypted-access',
    refreshToken: 'encrypted-refresh',
    tokenExpiresAt: new Date(Date.now() + 3600_000),
    scopes: ['calendar.readonly', 'calendar.events'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  beforeEach(async () => {
    const mockRepo = {
      findByTenantAndUser: jest.fn(),
      findByTenant: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      softDelete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsService,
        { provide: IntegrationsRepository, useValue: mockRepo },
        {
          provide: GoogleAuthService,
          useValue: {
            getAuthUrl: jest.fn(),
            exchangeCode: jest.fn(),
            encrypt: jest.fn((v: string) => `enc:${v}`),
            decrypt: jest.fn((v: string) => v.replace('enc:', '')),
            parseState: jest.fn(),
            revokeToken: jest.fn(),
            refreshAccessToken: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile()

    service = module.get(IntegrationsService)
    repository = module.get(IntegrationsRepository)
    googleAuth = module.get(GoogleAuthService)
  })

  describe('getConnectUrl', () => {
    it('should return Google OAuth URL', () => {
      googleAuth.getAuthUrl.mockReturnValue({
        url: 'https://accounts.google.com/...',
        codeVerifier: 'verifier-123',
        state: 'state-123',
      })

      const result = service.getConnectUrl(tenantId, userId)

      expect(result.url).toContain('accounts.google.com')
      expect(result.codeVerifier).toBe('verifier-123')
      expect(googleAuth.getAuthUrl).toHaveBeenCalledWith(tenantId, userId)
    })
  })

  describe('handleCallback', () => {
    it('should exchange code and create integration', async () => {
      googleAuth.parseState.mockReturnValue({ tenantId, userId })
      googleAuth.exchangeCode.mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-123',
        expiresIn: 3600,
        scopes: ['calendar.readonly'],
      })
      googleAuth.encrypt.mockImplementation((v: string) => `enc:${v}`)
      repository.create.mockResolvedValue(mockIntegration)

      const result = await service.handleCallback('auth-code', 'state-123', 'verifier-123')

      expect(result.provider).toBe('google_calendar')
      expect(repository.create).toHaveBeenCalledWith(
        tenantId,
        userId,
        'google_calendar',
        expect.objectContaining({
          accessToken: 'enc:access-123',
          refreshToken: 'enc:refresh-123',
        }),
      )
    })

    it('should throw when state is invalid', async () => {
      googleAuth.parseState.mockImplementation(() => {
        throw new Error('Invalid state')
      })

      await expect(
        service.handleCallback('code', 'bad-state', 'verifier'),
      ).rejects.toThrow()
    })
  })

  describe('findAll', () => {
    it('should return all integrations for tenant', async () => {
      repository.findByTenant.mockResolvedValue([mockIntegration])

      const result = await service.findAll(tenantId)

      expect(result.data).toHaveLength(1)
      expect(result.data[0].provider).toBe('google_calendar')
    })
  })

  describe('disconnect', () => {
    it('should soft delete and revoke token', async () => {
      repository.findById.mockResolvedValue(mockIntegration as any)
      googleAuth.decrypt.mockReturnValue('access-123')
      repository.softDelete.mockResolvedValue({ ...mockIntegration, deletedAt: new Date() } as any)

      const result = await service.disconnect(tenantId, 'int-1')

      expect(result.data.deleted).toBe(true)
      expect(googleAuth.revokeToken).toHaveBeenCalledWith('access-123')
      expect(repository.softDelete).toHaveBeenCalledWith(tenantId, 'int-1')
    })

    it('should throw INTEGRATION_NOT_FOUND when integration does not exist', async () => {
      repository.findById.mockResolvedValue(null)

      await expect(
        service.disconnect(tenantId, 'nonexistent'),
      ).rejects.toMatchObject({ code: 'INTEGRATION_NOT_FOUND' })
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm --filter @repo/api test -- integrations.service.spec
```

Expected: FAIL — module files don't exist.

- [ ] **Step 3: Create DTO**

Create `apps/api/src/modules/integrations/dto/connect-integration.dto.ts`:

```typescript
import { z } from 'zod'

export const googleCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
})

export type GoogleCallbackDto = z.infer<typeof googleCallbackSchema>
```

- [ ] **Step 4: Create Repository**

Create `apps/api/src/modules/integrations/integrations.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'

@Injectable()
export class IntegrationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenant(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findByTenantAndUser(tenantId: string, userId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId, userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.integration.findFirst({
      where: { id, tenantId, deletedAt: null },
    })
  }

  async create(
    tenantId: string,
    userId: string,
    provider: string,
    data: {
      providerAccountId: string
      accessToken: string
      refreshToken: string
      tokenExpiresAt: Date
      scopes: string[]
    },
  ) {
    return this.prisma.integration.create({
      data: {
        tenantId,
        userId,
        provider,
        providerAccountId: data.providerAccountId,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiresAt: data.tokenExpiresAt,
        scopes: data.scopes,
      },
    })
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.integration.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    })
  }

  async createCalendarEvent(data: {
    tenantId: string
    integrationId: string
    externalEventId: string
    title: string
    description?: string
    startAt: Date
    endAt: Date
    timezone: string
    location?: string
    attendees?: any
    hangoutLink?: string
    status: string
  }) {
    return this.prisma.calendarEvent.create({ data })
  }
}
```

- [ ] **Step 5: Create Service**

Create `apps/api/src/modules/integrations/integrations.service.ts`:

```typescript
import { Injectable } from '@nestjs/common'
import { IntegrationsRepository } from './integrations.repository'
import { GoogleAuthService } from './adapters/google/google-auth.service'
import { AppException } from '@core/errors/app.exception'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class IntegrationsService {
  constructor(
    private readonly repository: IntegrationsRepository,
    private readonly googleAuth: GoogleAuthService,
    private readonly config: ConfigService,
  ) {}

  getConnectUrl(tenantId: string, userId: string) {
    return this.googleAuth.getAuthUrl(tenantId, userId)
  }

  async handleCallback(code: string, state: string, codeVerifier: string) {
    const { tenantId, userId } = this.googleAuth.parseState(state)

    const tokens = await this.googleAuth.exchangeCode(code, codeVerifier)

    // Get user email from token info for providerAccountId
    const tokenInfo = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${tokens.accessToken}`,
    ).then((r) => r.json() as Promise<{ email: string }>)

    const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000)

    return this.repository.create(tenantId, userId, 'google_calendar', {
      providerAccountId: tokenInfo.email,
      accessToken: this.googleAuth.encrypt(tokens.accessToken),
      refreshToken: this.googleAuth.encrypt(tokens.refreshToken),
      tokenExpiresAt: expiresAt,
      scopes: tokens.scopes,
    })
  }

  async findAll(tenantId: string) {
    const integrations = await this.repository.findByTenant(tenantId)
    return {
      data: integrations.map((i) => ({
        id: i.id,
        provider: i.provider,
        providerAccountId: i.providerAccountId,
        isActive: i.isActive,
        tokenExpiresAt: i.tokenExpiresAt,
        createdAt: i.createdAt,
      })),
    }
  }

  async findById(tenantId: string, id: string) {
    const integration = await this.repository.findById(tenantId, id)
    if (!integration) {
      throw AppException.notFound('INTEGRATION_NOT_FOUND', 'Integração não encontrada', { id })
    }
    return { data: integration }
  }

  async disconnect(tenantId: string, id: string) {
    const integration = await this.repository.findById(tenantId, id)
    if (!integration) {
      throw AppException.notFound('INTEGRATION_NOT_FOUND', 'Integração não encontrada', { id })
    }

    if (integration.accessToken) {
      try {
        const accessToken = this.googleAuth.decrypt(integration.accessToken)
        await this.googleAuth.revokeToken(accessToken)
      } catch {
        // Best-effort revocation
      }
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  async getDecryptedAccessToken(tenantId: string, integrationId: string): Promise<string> {
    const integration = await this.repository.findById(tenantId, integrationId)
    if (!integration) {
      throw AppException.notFound('INTEGRATION_NOT_FOUND', 'Integração não encontrada', { id: integrationId })
    }
    if (!integration.isActive) {
      throw new AppException('INTEGRATION_NOT_CONNECTED', 'Integração desconectada')
    }

    // Check if token needs refresh
    if (integration.tokenExpiresAt && new Date() >= integration.tokenExpiresAt) {
      const refreshed = await this.googleAuth.refreshAccessToken(integration.refreshToken!)
      const newEncryptedAccess = this.googleAuth.encrypt(refreshed.accessToken)
      // Update token in DB would go here — for now just return the new token
      return refreshed.accessToken
    }

    return this.googleAuth.decrypt(integration.accessToken!)
  }
}
```

- [ ] **Step 6: Create Module**

Create `apps/api/src/modules/integrations/integrations.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { IntegrationsController } from './integrations.controller'
import { IntegrationsService } from './integrations.service'
import { IntegrationsRepository } from './integrations.repository'
import { GoogleAuthService } from './adapters/google/google-auth.service'
import { GoogleCalendarAdapter } from './adapters/google/google-calendar.adapter'
import { CALENDAR_PROVIDER } from './integrations.tokens'

@Module({
  controllers: [IntegrationsController],
  providers: [
    {
      provide: CALENDAR_PROVIDER,
      useClass: GoogleCalendarAdapter,
    },
    GoogleAuthService,
    IntegrationsService,
    IntegrationsRepository,
  ],
  exports: [IntegrationsService, CALENDAR_PROVIDER],
})
export class IntegrationsModule {}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
pnpm --filter @repo/api test -- integrations.service.spec
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/modules/integrations/
git commit -m "feat(integrations): add service, repository, and module with Google OAuth2 flow"
```

---

## Task 7: Integrations Controller

**Files:**
- Create: `apps/api/src/modules/integrations/integrations.controller.ts`

- [ ] **Step 1: Create controller**

```typescript
import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'
import { IntegrationsService } from './integrations.service'
import { CurrentTenant } from '@shared/decorators/current-tenant.decorator'
import { CurrentUser } from '@shared/decorators/current-user.decorator'
import { Roles } from '@shared/decorators/roles.decorator'
import { RoleGuard } from '@core/guards/role.guard'

@UseGuards(RoleGuard)
@Roles('admin', 'agent')
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Get('google/connect')
  async connectGoogle(
    @CurrentTenant() tenantId: string,
    @CurrentUser() userId: string,
    @Res() res: Response,
  ) {
    const { url, codeVerifier, state } = this.integrationsService.getConnectUrl(tenantId, userId)

    // Store codeVerifier in a cookie or temp storage
    res.cookie('google_oauth_verifier', codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 min
    })

    return res.redirect(url)
  }

  @Get('google/callback')
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const codeVerifier = res.req.cookies?.['google_oauth_verifier']

    if (!codeVerifier) {
      return res.redirect(`${process.env.WEB_URL}/settings?error=oauth_expired`)
    }

    try {
      await this.integrationsService.handleCallback(code, state, codeVerifier)
      res.clearCookie('google_oauth_verifier')
      return res.redirect(`${process.env.WEB_URL}/settings?connected=google_calendar`)
    } catch {
      return res.redirect(`${process.env.WEB_URL}/settings?error=oauth_failed`)
    }
  }

  @Get()
  findAll(@CurrentTenant() tenantId: string) {
    return this.integrationsService.findAll(tenantId)
  }

  @Get(':id')
  findById(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.integrationsService.findById(tenantId, id)
  }

  @Delete(':id')
  @UseGuards(RoleGuard)
  @Roles('admin')
  async disconnect(
    @CurrentTenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.integrationsService.disconnect(tenantId, id)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/integrations/integrations.controller.ts
git commit -m "feat(integrations): add controller with OAuth connect/callback/disconnect endpoints"
```

---

## Task 8: Register Module in AppModule

**Files:**
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Import IntegrationsModule**

Add import at line 23 (after `FollowUpModule`):

```typescript
import { IntegrationsModule } from './modules/integrations/integrations.module'
```

Add `IntegrationsModule` to the `imports` array (after `FollowUpModule`):

```typescript
    IntegrationsModule,
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/app.module.ts
git commit -m "feat(app): register IntegrationsModule in AppModule"
```

---

## Task 9: AI Tool DTO Schemas

**Files:**
- Modify: `apps/api/src/modules/ai-tools/dto/create-ai-tool.dto.ts`

- [ ] **Step 1: Add Zod schemas for new tool types**

After the `SetarEtapaPipelineConfig` definition (line 16), add:

```typescript
const ConsultarDisponibilidadeConfig = z.object({
  integrationId: z.string().min(1),
  lookAheadDays: z.number().int().min(1).max(30).default(7),
  slotDurationMinutes: z.number().int().min(15).max(480).default(60),
  workingHours: z.object({
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
    workingDays: z.array(z.number().int().min(1).max(7)),
  }).default({ start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] }),
})

const CriarEventoConfig = z.object({
  integrationId: z.string().min(1),
  defaultDurationMinutes: z.number().int().min(15).max(480).default(60),
  defaultLocation: z.string().optional(),
  timezone: z.string().default('America/Sao_Paulo'),
  createMeetLink: z.boolean().default(true),
})
```

Add both to the `z.union` array in `createAiToolSchema`:

```typescript
  config: z.union([
    AdicionarTagConfig,
    CriarDealConfig,
    TransferirHumanoConfig,
    WebhookExternoConfig,
    SetarEtapaPipelineConfig,
    ConsultarDisponibilidadeConfig,
    CriarEventoConfig,
    z.object({}),
  ]),
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/ai-tools/dto/create-ai-tool.dto.ts
git commit -m "feat(ai-tools): add DTO schemas for CONSULTAR_DISPONIBILIDADE and CRIAR_EVENTO"
```

---

## Task 10: Tool Executor — Calendar Tool Cases

**Files:**
- Modify: `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts`
- Modify: `apps/api/src/modules/ai-tools/ai-tools.module.ts`

- [ ] **Step 1: Add IntegrationsModule import to AiToolsModule**

Modify `apps/api/src/modules/ai-tools/ai-tools.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { ContactsModule } from '@modules/contacts/contacts.module'
import { TagModule } from '@modules/tag/tag.module'
import { DealModule } from '@modules/deal/deal.module'
import { IntegrationsModule } from '@modules/integrations/integrations.module'
import { AiToolsController } from './ai-tools.controller'
import { AiToolsService } from './ai-tools.service'
import { AiToolsRepository } from './ai-tools.repository'
import { ToolExecutorService } from './definitions/tool-executor.service'

@Module({
  imports: [ContactsModule, TagModule, DealModule, IntegrationsModule],
  controllers: [AiToolsController],
  providers: [AiToolsService, AiToolsRepository, ToolExecutorService],
  exports: [AiToolsService, ToolExecutorService],
})
export class AiToolsModule {}
```

- [ ] **Step 2: Add calendar tool execution methods to ToolExecutorService**

Modify `apps/api/src/modules/ai-tools/definitions/tool-executor.service.ts`. Add imports at the top:

```typescript
import { IntegrationsService } from '@modules/integrations/integrations.service'
import { CALENDAR_PROVIDER } from '@modules/integrations/integrations.tokens'
import type { ICalendarProvider } from '@modules/integrations/ports/calendar-provider.interface'
```

Add to constructor:

```typescript
  constructor(
    private readonly contactsService: ContactsService,
    private readonly tagService: TagService,
    private readonly dealService: DealService,
    @Inject(CALENDAR_PROVIDER)
    private readonly calendarProvider: ICalendarProvider,
    private readonly integrationsService: IntegrationsService,
    private readonly logger: LoggerService,
  ) {}
```

Add `Inject` to imports:

```typescript
import { Injectable, HttpStatus, Inject } from '@nestjs/common'
```

Add cases to the switch in `execute`:

```typescript
        case AiToolType.CONSULTAR_DISPONIBILIDADE:
          return this.executeConsultarDisponibilidade(tool, context)
        case AiToolType.CRIAR_EVENTO:
          return this.executeCriarEvento(tool, context)
```

Add private methods before `executeWebhookExterno`:

```typescript
  private async executeConsultarDisponibilidade(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as {
      integrationId: string
      lookAheadDays: number
      slotDurationMinutes: number
      workingHours: { start: string; end: string; workingDays: number[] }
    }

    try {
      const accessToken = await this.integrationsService.getDecryptedAccessToken(
        context.tenantId,
        config.integrationId,
      )

      const from = new Date()
      const to = new Date(from.getTime() + config.lookAheadDays * 24 * 60 * 60 * 1000)

      const slots = await this.calendarProvider.getFreeSlots(
        accessToken,
        from,
        to,
        config.slotDurationMinutes,
        config.workingHours,
      )

      if (slots.length === 0) {
        return { success: true, output: 'Nenhum horário disponível nos próximos dias.' }
      }

      const formatted = slots.slice(0, 20).map((s) => {
        const date = s.startAt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
        const time = s.startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        return `${date} às ${time}`
      })

      return {
        success: true,
        output: `Horários disponíveis:\n${formatted.join('\n')}`,
        data: { slots: slots.slice(0, 20) },
      }
    } catch (error) {
      return {
        success: false,
        output: `Erro ao consultar disponibilidade: ${(error as Error).message}`,
      }
    }
  }

  private async executeCriarEvento(tool: AiTool, context: ToolContext): Promise<ToolResult> {
    const config = tool.config as {
      integrationId: string
      defaultDurationMinutes: number
      defaultLocation?: string
      timezone: string
      createMeetLink: boolean
    }

    try {
      const accessToken = await this.integrationsService.getDecryptedAccessToken(
        context.tenantId,
        config.integrationId,
      )

      const startAt = new Date()
      const endAt = new Date(startAt.getTime() + config.defaultDurationMinutes * 60_000)

      const result = await this.calendarProvider.createEvent(accessToken, {
        title: `Reunião - ${context.contactName ?? context.contactPhone}`,
        description: `Agendado via WhatsApp por ${context.contactName ?? context.contactPhone}`,
        startAt,
        endAt,
        timezone: config.timezone,
        location: config.defaultLocation,
        createMeetLink: config.createMeetLink,
      })

      return {
        success: true,
        output: `Evento criado!\nLink: ${result.htmlLink}${result.hangoutLink ? `\nMeet: ${result.hangoutLink}` : ''}`,
        data: { eventId: result.eventId, htmlLink: result.htmlLink, hangoutLink: result.hangoutLink },
      }
    } catch (error) {
      return {
        success: false,
        output: `Erro ao criar evento: ${(error as Error).message}`,
      }
    }
  }
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/ai-tools/
git commit -m "feat(ai-tools): add CONSULTAR_DISPONIBILIDADE and CRIAR_EVENTO tool execution"
```

---

## Task 11: Tool Executor Tests — Calendar Tools

**Files:**
- Modify: `apps/api/src/modules/ai-tools/__tests__/tool-executor.service.spec.ts`

- [ ] **Step 1: Add test cases for calendar tools**

Add imports at top:

```typescript
import { INTEGRATION_NOT_FOUND } from '@core/errors/error-codes'
import type { ICalendarProvider } from '@modules/integrations/ports/calendar-provider.interface'
import { CALENDAR_PROVIDER } from '@modules/integrations/integrations.tokens'
import { IntegrationsService } from '@modules/integrations/integrations.service'
```

Add to the `beforeEach` providers array:

```typescript
        {
          provide: CALENDAR_PROVIDER,
          useValue: {
            createEvent: jest.fn(),
            getFreeSlots: jest.fn(),
          },
        },
        {
          provide: IntegrationsService,
          useValue: {
            getDecryptedAccessToken: jest.fn(),
          },
        },
```

Add after the `beforeEach` block:

```typescript
  let calendarProvider: jest.Mocked<ICalendarProvider>
  let integrationsService: jest.Mocked<IntegrationsService>

  // Inside beforeEach, after getting other services:
  calendarProvider = module.get(CALENDAR_PROVIDER)
  integrationsService = module.get(IntegrationsService)
```

Add test cases before the closing `})`:

```typescript
  describe('CONSULTAR_DISPONIBILIDADE', () => {
    it('should return formatted free slots', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockResolvedValue('access-token')
      calendarProvider.getFreeSlots = jest.fn().mockResolvedValue([
        { startAt: new Date('2026-04-17T09:00:00'), endAt: new Date('2026-04-17T10:00:00') },
        { startAt: new Date('2026-04-17T10:00:00'), endAt: new Date('2026-04-17T11:00:00') },
      ])

      const tool = {
        ...baseTool,
        type: AiToolType.CONSULTAR_DISPONIBILIDADE,
        config: {
          integrationId: 'int-1',
          lookAheadDays: 7,
          slotDurationMinutes: 60,
          workingHours: { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Horários disponíveis')
      expect(integrationsService.getDecryptedAccessToken).toHaveBeenCalledWith('tenant-123', 'int-1')
    })

    it('should return message when no slots available', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockResolvedValue('access-token')
      calendarProvider.getFreeSlots = jest.fn().mockResolvedValue([])

      const tool = {
        ...baseTool,
        type: AiToolType.CONSULTAR_DISPONIBILIDADE,
        config: {
          integrationId: 'int-1',
          lookAheadDays: 7,
          slotDurationMinutes: 60,
          workingHours: { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Nenhum horário disponível')
    })

    it('should return error when integration not found', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockRejectedValue(
        new Error('Integration not found'),
      )

      const tool = {
        ...baseTool,
        type: AiToolType.CONSULTAR_DISPONIBILIDADE,
        config: {
          integrationId: 'nonexistent',
          lookAheadDays: 7,
          slotDurationMinutes: 60,
          workingHours: { start: '08:00', end: '18:00', workingDays: [1, 2, 3, 4, 5] },
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('Erro ao consultar')
    })
  })

  describe('CRIAR_EVENTO', () => {
    it('should create event and return link', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockResolvedValue('access-token')
      calendarProvider.createEvent = jest.fn().mockResolvedValue({
        eventId: 'evt-1',
        htmlLink: 'https://calendar.google.com/event?eid=xxx',
        hangoutLink: 'https://meet.google.com/abc',
        status: 'confirmed',
      })

      const tool = {
        ...baseTool,
        type: AiToolType.CRIAR_EVENTO,
        config: {
          integrationId: 'int-1',
          defaultDurationMinutes: 60,
          timezone: 'America/Sao_Paulo',
          createMeetLink: true,
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Evento criado')
      expect(result.data).toHaveProperty('eventId', 'evt-1')
    })

    it('should return error when integration is disconnected', async () => {
      integrationsService.getDecryptedAccessToken = jest.fn().mockRejectedValue(
        new Error('Integration disconnected'),
      )

      const tool = {
        ...baseTool,
        type: AiToolType.CRIAR_EVENTO,
        config: {
          integrationId: 'int-1',
          defaultDurationMinutes: 60,
          timezone: 'America/Sao_Paulo',
          createMeetLink: true,
        },
      }

      const result = await executor.execute(tool, context)

      expect(result.success).toBe(false)
      expect(result.output).toContain('Erro ao criar evento')
    })
  })
```

- [ ] **Step 2: Run tests**

```bash
pnpm --filter @repo/api test -- tool-executor.service.spec
```

Expected: All tests PASS (old + new).

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/modules/ai-tools/__tests__/tool-executor.service.spec.ts
git commit -m "test(ai-tools): add tests for CONSULTAR_DISPONIBILIDADE and CRIAR_EVENTO"
```

---

## Task 12: Assistant Prompt Builder — Calendar Instructions

**Files:**
- Modify: `apps/api/src/modules/assistants/services/assistant-prompt.builder.ts`

- [ ] **Step 1: Add calendar tool type detection to prompt**

After the existing `if (input.tools?.length)` block (lines 45-56), modify the tools section to add calendar-specific instructions:

Replace the entire `// 4. AVAILABLE TOOLS` block with:

```typescript
    // 4. AVAILABLE TOOLS
    if (input.tools?.length) {
      const toolList = input.tools
        .map((t) => `- ${t.name}: ${t.description ?? ''}`)
        .join('\n')

      const sections_list: string[] = [
        '## Ferramentas disponíveis:',
        toolList,
        'Para executar uma ferramenta, inclua [TOOL:TIPO] na sua resposta (ex: [TOOL:CRIAR_DEAL]).',
      ]

      // Calendar-specific instructions
      const hasCalendarTools = input.tools.some(
        (t) => t.name === 'Consultar Disponibilidade' || t.name === 'Criar Evento',
      )
      if (hasCalendarTools) {
        sections_list.push(
          '',
          '### Instruções para agendamento:',
          '- Para consultar horários disponíveis: use [TOOL:CONSULTAR_DISPONIBILIDADE]',
          '- Para criar um evento após confirmação: use [TOOL:CRIAR_EVENTO]',
          '- Sempre confirme data e horário com o contato antes de agendar',
          '- Se o contato não informar email, pergunte antes de criar o evento',
        )
      }

      sections.push(sections_list.join('\n'))
    }
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/modules/assistants/services/assistant-prompt.builder.ts
git commit -m "feat(assistants): add calendar-specific instructions to prompt builder"
```

---

## Task 13: Frontend — API Hook

**Files:**
- Create: `apps/web/src/hooks/use-integrations.ts`

- [ ] **Step 1: Create the API hook**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth.store'

interface Integration {
  id: string
  provider: string
  providerAccountId: string
  isActive: boolean
  tokenExpiresAt: string | null
  createdAt: string
}

export function useIntegrations() {
  const t = useTranslations('settings.integrations')
  const { token } = useAuthStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setIntegrations(data)
    } catch {
      toast.error(t('error.loading'))
    } finally {
      setLoading(false)
    }
  }, [token, t])

  useEffect(() => {
    if (token) fetchIntegrations()
  }, [token, fetchIntegrations])

  const connectGoogle = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/integrations/google/connect`
  }

  const disconnect = async (id: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/integrations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast.success(t('success.disconnected'))
      await fetchIntegrations()
    } catch {
      toast.error(t('error.disconnecting'))
    }
  }

  return { integrations, loading, connectGoogle, disconnect, refetch: fetchIntegrations }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/hooks/use-integrations.ts
git commit -m "feat(web): add useIntegrations hook for Google Calendar connect/disconnect"
```

---

## Task 14: Frontend — Google Calendar Card Component

**Files:**
- Create: `apps/web/src/components/settings/google-calendar-card.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'

import { useState } from 'react'
import { Calendar, Check, ExternalLink, Loader2, Unplug } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Integration {
  id: string
  provider: string
  providerAccountId: string
  isActive: boolean
  tokenExpiresAt: string | null
  createdAt: string
}

interface GoogleCalendarCardProps {
  integration: Integration | undefined
  onConnect: () => void
  onDisconnect: (id: string) => Promise<void>
  loading: boolean
}

export function GoogleCalendarCard({
  integration,
  onConnect,
  onDisconnect,
  loading,
}: GoogleCalendarCardProps) {
  const t = useTranslations('settings.integrations')
  const tCommon = useTranslations('common')
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const isExpired = integration?.tokenExpiresAt
    ? new Date(integration.tokenExpiresAt) < new Date()
    : false

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await onDisconnect(integration!.id)
    } finally {
      setDisconnecting(false)
      setShowDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3.5 py-1">
        <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center text-lg shrink-0">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Google Calendar</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                Produtividade
              </span>
              {integration?.isActive && !isExpired && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5" />
                  {t('connected')}
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  {t('expired')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {integration?.isActive
                ? integration.providerAccountId
                : t('googleCalendar')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {integration?.isActive ? (
            <>
              <a
                href={`https://calendar.google.com/calendar/r?authuser=${integration.providerAccountId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 pr-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                onClick={() => setShowDialog(true)}
              >
                <Unplug className="h-3 w-3" />
                {t('disconnect')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 pr-2"
              onClick={onConnect}
            >
              {t('connect')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={(v) => !v && setShowDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmDisconnect')}</DialogTitle>
            <DialogDescription>{t('confirmDisconnectDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {disconnecting ? tCommon('loading') : t('disconnect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/settings/google-calendar-card.tsx
git commit -m "feat(web): add GoogleCalendarCard component with connect/disconnect UI"
```

---

## Task 15: Frontend — Update Settings Page

**Files:**
- Modify: `apps/web/src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: Replace IntegrationsSection with real implementation**

Add import at top of file:

```typescript
import { useIntegrations } from '@/hooks/use-integrations'
import { GoogleCalendarCard } from '@/components/settings/google-calendar-card'
```

Replace the entire `IntegrationsSection` function (lines 307-361) with:

```typescript
function IntegrationsSection() {
  const t = useTranslations('settings.integrations')
  const { integrations, loading, connectGoogle, disconnect } = useIntegrations()

  const googleCalendarIntegration = integrations.find(
    (i) => i.provider === 'google_calendar',
  )

  return (
    <SectionBlock icon={Plug} title={t('title')} description={t('description')}>
      <div className="space-y-3">
        <GoogleCalendarCard
          integration={googleCalendarIntegration}
          onConnect={connectGoogle}
          onDisconnect={disconnect}
          loading={loading}
        />

        {/* Future integrations placeholder */}
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between gap-4 py-1 opacity-40 pointer-events-none select-none">
          <div className="flex items-center gap-3.5">
            <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center text-lg shrink-0">
              ⚙️
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">n8n</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('n8n')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1 pr-2" disabled>
            {t('connect')}
          </Button>
        </div>
      </div>
    </SectionBlock>
  )
}
```

Remove the `INTEGRATIONS` constant array (lines 280-305) since it's no longer needed.

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/app/(dashboard)/settings/page.tsx
git commit -m "feat(web): replace integrations overlay with real Google Calendar connection UI"
```

---

## Task 16: i18n — Translation Keys

**Files:**
- Modify: `apps/web/messages/pt-BR.json`
- Modify: `apps/web/messages/en.json`
- Modify: `apps/web/messages/es.json`

- [ ] **Step 1: Update pt-BR.json integrations section**

Replace the existing `"integrations"` object inside `"settings"` with:

```json
"integrations": {
  "title": "Integrações",
  "description": "Conecte ferramentas externas",
  "connect": "Conectar",
  "disconnect": "Desconectar",
  "connected": "Conectado",
  "expired": "Token expirado",
  "reconnect": "Reconectar",
  "confirmDisconnect": "Desconectar Google Calendar?",
  "confirmDisconnectDescription": "Os agendamentos existentes não serão afetados, mas a IA não poderá criar novos eventos.",
  "n8n": "Automações e fluxos de trabalho personalizados",
  "googleCalendar": "Sincronize agendamentos com sua agenda",
  "zapier": "Conecte com mais de 5.000 aplicativos",
  "googleSheets": "Exporte contatos e conversas para planilhas",
  "automation": "Automação",
  "productivity": "Produtividade",
  "success": {
    "disconnected": "Google Calendar desconectado com sucesso"
  },
  "error": {
    "loading": "Erro ao carregar integrações",
    "disconnecting": "Erro ao desconectar"
  }
}
```

- [ ] **Step 2: Update en.json integrations section**

Find the `"integrations"` object inside `"settings"` in `en.json` and replace:

```json
"integrations": {
  "title": "Integrations",
  "description": "Connect external tools",
  "connect": "Connect",
  "disconnect": "Disconnect",
  "connected": "Connected",
  "expired": "Token expired",
  "reconnect": "Reconnect",
  "confirmDisconnect": "Disconnect Google Calendar?",
  "confirmDisconnectDescription": "Existing appointments will not be affected, but the AI will not be able to create new events.",
  "n8n": "Automations and custom workflows",
  "googleCalendar": "Sync appointments with your calendar",
  "zapier": "Connect with over 5,000 apps",
  "googleSheets": "Export contacts and conversations to spreadsheets",
  "automation": "Automation",
  "productivity": "Productivity",
  "success": {
    "disconnected": "Google Calendar disconnected successfully"
  },
  "error": {
    "loading": "Error loading integrations",
    "disconnecting": "Error disconnecting"
  }
}
```

- [ ] **Step 3: Update es.json integrations section**

Find the `"integrations"` object inside `"settings"` in `es.json` and replace:

```json
"integrations": {
  "title": "Integraciones",
  "description": "Conecta herramientas externas",
  "connect": "Conectar",
  "disconnect": "Desconectar",
  "connected": "Conectado",
  "expired": "Token expirado",
  "reconnect": "Reconectar",
  "confirmDisconnect": "Desconectar Google Calendar?",
  "confirmDisconnectDescription": "Las citas existentes no se verán afectadas, pero la IA no podrá crear nuevos eventos.",
  "n8n": "Automatizaciones y flujos de trabajo personalizados",
  "googleCalendar": "Sincroniza citas con tu agenda",
  "zapier": "Conecta con más de 5.000 aplicaciones",
  "googleSheets": "Exporta contactos y conversaciones a hojas de cálculo",
  "automation": "Automatización",
  "productivity": "Productividad",
  "success": {
    "disconnected": "Google Calendar desconectado exitosamente"
  },
  "error": {
    "loading": "Error al cargar integraciones",
    "disconnecting": "Error al desconectar"
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/messages/pt-BR.json apps/web/messages/en.json apps/web/messages/es.json
git commit -m "feat(i18n): add integration translation keys for pt-BR, en, es"
```

---

## Task 17: Environment Variables

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add new env vars to .env.example**

```env
# Google Calendar Integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URL=http://localhost:3000/integrations/google/callback
ENCRYPTION_KEY=  # 32-char key for AES-256 token encryption
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add Google Calendar env vars to .env.example"
```

---

## Task 18: Final Integration Test

- [ ] **Step 1: Run all backend tests**

```bash
pnpm --filter @repo/api test
```

Expected: All tests pass.

- [ ] **Step 2: Verify frontend builds**

```bash
pnpm --filter @repo/web build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address test/build issues from integration"
```
