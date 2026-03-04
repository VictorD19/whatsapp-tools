import { create } from 'zustand'

export type ConversationStatus = 'PENDING' | 'OPEN' | 'CLOSE'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN'

export type InboxTab = 'all' | 'mine' | 'unassigned'

export interface ConversationContact {
  id: string
  phone: string
  name: string | null
  avatarUrl: string | null
}

export interface ConversationInstance {
  id: string
  name: string
}

export interface ConversationAssignee {
  id: string
  name: string
}

export interface LastMessage {
  body: string | null
  type: MessageType
  fromMe: boolean
}

export type DealStageType = 'ACTIVE' | 'WON' | 'LOST'

export interface ConversationDealStage {
  id: string
  name: string
  color: string
  type: DealStageType
}

export interface ConversationDealPipeline {
  id: string
  name: string
}

export interface ConversationDeal {
  id: string
  title: string | null
  value: number | null
  stageId: string
  stage: ConversationDealStage
  pipeline: ConversationDealPipeline
  wonAt: string | null
  lostAt: string | null
}

export interface Conversation {
  id: string
  instanceId: string
  contactId: string
  assignedToId: string | null
  status: ConversationStatus
  tags: string[]
  summary: string | null
  unreadCount: number
  lastMessageAt: string | null
  closedAt: string | null
  createdAt: string
  contact: ConversationContact
  instance: ConversationInstance
  assignedTo: ConversationAssignee | null
  messages?: LastMessage[]
  deals?: ConversationDeal[]
}

export interface QuotedMessage {
  id: string
  body: string | null
  fromMe: boolean
  type: MessageType
}

export interface Message {
  id: string
  conversationId: string
  fromMe: boolean
  fromBot: boolean
  body: string | null
  type: MessageType
  status: MessageStatus
  mediaUrl: string | null
  quotedMessageId: string | null
  quotedMessage: QuotedMessage | null
  sentAt: string
  createdAt: string
}

interface ConversationsPagination {
  page: number
  totalPages: number
  total: number
  hasMore: boolean
}

interface InboxState {
  activeTab: InboxTab
  selectedConversationId: string | null
  conversations: Conversation[]
  conversationsPagination: ConversationsPagination
  messages: Record<string, Message[]>
  isLoadingConversations: boolean
  isLoadingMoreConversations: boolean
  isLoadingMessages: boolean
  tabCounts: Record<InboxTab, number>
  replyingTo: Message | null

  setActiveTab: (tab: InboxTab) => void
  setTabCount: (tab: InboxTab, count: number) => void
  selectConversation: (id: string | null) => void
  setConversations: (conversations: Conversation[], pagination: ConversationsPagination) => void
  appendConversations: (conversations: Conversation[], pagination: ConversationsPagination) => void
  setLoadingConversations: (loading: boolean) => void
  setLoadingMoreConversations: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  upsertConversation: (conversation: Conversation) => void
  removeConversation: (id: string) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  appendMessage: (conversationId: string, message: Message) => void
  updateMessageStatus: (conversationId: string, messageId: string, status: MessageStatus) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
  setReplyingTo: (message: Message | null) => void
}

export const useInboxStore = create<InboxState>()((set) => ({
  activeTab: 'mine',
  selectedConversationId: null,
  conversations: [],
  conversationsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
  messages: {},
  isLoadingConversations: false,
  isLoadingMoreConversations: false,
  isLoadingMessages: false,
  tabCounts: { all: 0, mine: 0, unassigned: 0 },
  replyingTo: null,

  setActiveTab: (activeTab) => set({ activeTab }),
  setTabCount: (tab, count) =>
    set((state) => ({ tabCounts: { ...state.tabCounts, [tab]: count } })),

  selectConversation: (selectedConversationId) => set({ selectedConversationId }),

  setConversations: (conversations, pagination) => set({ conversations, conversationsPagination: pagination }),

  appendConversations: (newConversations, pagination) =>
    set((state) => {
      // Deduplicate by id
      const existingIds = new Set(state.conversations.map((c) => c.id))
      const unique = newConversations.filter((c) => !existingIds.has(c.id))
      return {
        conversations: [...state.conversations, ...unique],
        conversationsPagination: pagination,
      }
    }),

  setLoadingConversations: (isLoadingConversations) => set({ isLoadingConversations }),

  setLoadingMoreConversations: (isLoadingMoreConversations) => set({ isLoadingMoreConversations }),

  setLoadingMessages: (isLoadingMessages) => set({ isLoadingMessages }),

  upsertConversation: (conversation) =>
    set((state) => {
      const existing = state.conversations.findIndex((c) => c.id === conversation.id)
      if (existing >= 0) {
        const updated = [...state.conversations]
        updated[existing] = conversation
        return { conversations: updated }
      }
      return { conversations: [conversation, ...state.conversations] }
    }),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      ...(state.selectedConversationId === id ? { selectedConversationId: null } : {}),
    })),

  setMessages: (conversationId, messages) =>
    set((state) => ({
      messages: { ...state.messages, [conversationId]: messages },
    })),

  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.messages[conversationId] ?? []
      if (existing.some((m) => m.id === message.id)) return state
      return {
        messages: {
          ...state.messages,
          [conversationId]: [...existing, message],
        },
      }
    }),

  updateMessageStatus: (conversationId, messageId, status) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: (state.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, status } : m
        ),
      },
    })),

  incrementUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: c.unreadCount + 1 } : c
      ),
    })),

  clearUnread: (conversationId) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      ),
    })),

  setReplyingTo: (replyingTo) => set({ replyingTo }),
}))
