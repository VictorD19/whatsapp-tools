export type WebhookEvent =
  | 'MESSAGES_UPSERT'
  | 'MESSAGES_UPDATE'
  | 'QRCODE_UPDATED'
  | 'CONNECTION_UPDATE'
  | 'SEND_MESSAGE'

export interface InboundWebhookDto {
  instanceId: string
  tenantId: string
  event: WebhookEvent
  payload: unknown
  receivedAt: string
}
