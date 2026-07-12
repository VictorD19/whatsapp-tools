export interface MetaCapiEventPayload {
  eventName: string
  externalId?: string
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  ipAddress?: string
  userAgent?: string
  value?: number
  currency?: string
  orderId?: string
  contentIds?: string[]
  actionSource?: string
  ctwaClid?: string
}

export interface MetaCapiSendResult {
  eventsReceived: number
  fbtraceId: string
}

export interface IMetaCapiProvider {
  sendEvent(
    pixelId: string,
    accessToken: string,
    payload: MetaCapiEventPayload,
    testEventCode?: string,
  ): Promise<MetaCapiSendResult>
}
