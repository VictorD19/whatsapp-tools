export interface InstanceEntity {
  id: string
  tenantId: string
  name: string
  phone: string | null
  status: 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'BANNED'
  evolutionId: string
  createdAt: Date
  updatedAt: Date
}
