export interface ConversationEntity {
  id: string
  tenantId: string
  instanceId: string
  contactId: string
  assignedToId: string | null
  status: 'PENDING' | 'OPEN' | 'CLOSE'
  tags: string[]
  summary: string | null
  unreadCount: number
  lastMessageAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}
