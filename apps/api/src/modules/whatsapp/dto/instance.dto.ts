export interface CreateInstanceDto {
  name: string
  tenantId: string
  webhookUrl?: string
}

export interface InstanceResult {
  instanceId: string
  status: InstanceStatus
}

export type InstanceStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'BANNED'

export interface QRCodeResult {
  qrCode: string
  pairingCode?: string
}
