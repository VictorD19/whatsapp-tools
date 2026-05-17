import { Injectable, Logger } from '@nestjs/common'
import * as crypto from 'crypto'
import type {
  IMetaCapiProvider,
  MetaCapiEventPayload,
  MetaCapiSendResult,
} from '../../ports/meta-capi-provider.interface'

const API_VERSION = 'v21.0'
const API_BASE = 'https://graph.facebook.com'

@Injectable()
export class MetaGraphAdapter implements IMetaCapiProvider {
  private readonly logger = new Logger(MetaGraphAdapter.name)

  async sendEvent(
    pixelId: string,
    accessToken: string,
    payload: MetaCapiEventPayload,
    testEventCode?: string,
  ): Promise<MetaCapiSendResult> {
    const userData: Record<string, unknown> = {}

    if (payload.email) userData['em'] = [this.hash(payload.email)]
    if (payload.phone) userData['ph'] = [this.hashPhone(payload.phone)]
    if (payload.firstName) userData['fn'] = [this.hash(payload.firstName)]
    if (payload.lastName) userData['ln'] = [this.hash(payload.lastName)]
    if (payload.externalId) userData['external_id'] = payload.externalId
    if (payload.ipAddress) userData['client_ip_address'] = payload.ipAddress
    if (payload.userAgent) userData['client_user_agent'] = payload.userAgent

    const event: Record<string, unknown> = {
      event_name: payload.eventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: `${payload.eventName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action_source: payload.actionSource ?? 'business_messaging',
      user_data: userData,
    }

    if (payload.value !== undefined || payload.orderId || payload.contentIds) {
      event['custom_data'] = {
        ...(payload.value !== undefined && { value: payload.value }),
        ...(payload.currency && { currency: payload.currency }),
        ...(payload.orderId && { order_id: payload.orderId }),
        ...(payload.contentIds && { content_ids: payload.contentIds }),
      }
    }

    const body: Record<string, unknown> = {
      data: [event],
      access_token: accessToken,
    }

    if (testEventCode) body['test_event_code'] = testEventCode

    const url = `${API_BASE}/${API_VERSION}/${pixelId}/events`
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const json = (await response.json()) as {
      events_received?: number
      fbtrace_id?: string
      error?: { message: string; code: number }
    }

    if (!response.ok || json.error) {
      const msg = json.error?.message ?? `HTTP ${response.status}`
      this.logger.error(`Meta CAPI error: ${msg}`)
      throw new Error(`Meta CAPI: ${msg}`)
    }

    this.logger.log(`Meta CAPI: ${payload.eventName} → events_received=${json.events_received}`)

    return {
      eventsReceived: json.events_received ?? 0,
      fbtraceId: json.fbtrace_id ?? '',
    }
  }

  private hash(value: string): string {
    return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
  }

  private hashPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '')
    const e164 = digits.startsWith('55') ? `+${digits}` : `+55${digits}`
    return this.hash(e164)
  }
}
