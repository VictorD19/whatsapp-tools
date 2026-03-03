import { create } from 'zustand'

export type ConversationStatus = 'PENDING' | 'OPEN' | 'CLOSE'
export type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'
export type MessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' | 'STICKER' | 'LOCATION' | 'CONTACT' | 'UNKNOWN'

export type InboxTab = 'pending' | 'mine' | 'all' | 'closed'

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
  sentAt: string
  createdAt: string
}

interface InboxState {
  activeTab: InboxTab
  selectedConversationId: string | null
  conversations: Conversation[]
  messages: Record<string, Message[]>
  isLoadingConversations: boolean
  isLoadingMessages: boolean

  setActiveTab: (tab: InboxTab) => void
  selectConversation: (id: string | null) => void
  setConversations: (conversations: Conversation[]) => void
  setLoadingConversations: (loading: boolean) => void
  setLoadingMessages: (loading: boolean) => void
  upsertConversation: (conversation: Conversation) => void
  removeConversation: (id: string) => void
  setMessages: (conversationId: string, messages: Message[]) => void
  appendMessage: (conversationId: string, message: Message) => void
  updateMessageStatus: (conversationId: string, messageId: string, status: MessageStatus) => void
  incrementUnread: (conversationId: string) => void
  clearUnread: (conversationId: string) => void
}

export const useInboxStore = create<InboxState>()((set) => ({
  activeTab: 'pending',
  selectedConversationId: null,
  conversations: [],
  messages: {},
  isLoadingConversations: false,
  isLoadingMessages: false,

  setActiveTab: (activeTab) => set({ activeTab }),

  selectConversation: (selectedConversationId) => set({ selectedConversationId }),

  setConversations: (conversations) => set({ conversations }),

  setLoadingConversations: (isLoadingConversations) => set({ isLoadingConversations }),

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
    set((state) => ({
      messages: {
        ...state.messages,
        [conversationId]: [...(state.messages[conversationId] ?? []), message],
      },
    })),

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
}))
