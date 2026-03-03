import { useEffect, useRef } from 'react'
import { getSocket } from '@/lib/socket'
import { useInboxStore, type Conversation, type Message, type MessageStatus } from '@/stores/inbox.store'

const NOTIFICATION_SOUND_URL = '/sounds/notification.mp3'

function playNotificationSound() {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL)
    audio.volume = 0.5
    audio.play().catch(() => {
      // Autoplay blocked — ignore
    })
  } catch {
    // No audio support
  }
}

function updateDocumentTitle(unreadTotal: number) {
  const base = 'WhatsApp Tools'
  document.title = unreadTotal > 0 ? `(${unreadTotal}) ${base}` : base
}

export function useInboxSocket() {
  const upsertConversation = useInboxStore((s) => s.upsertConversation)
  const removeConversation = useInboxStore((s) => s.removeConversation)
  const appendMessage = useInboxStore((s) => s.appendMessage)
  const incrementUnread = useInboxStore((s) => s.incrementUnread)
  const updateMessageStatus = useInboxStore((s) => s.updateMessageStatus)
  const selectedConversationId = useInboxStore((s) => s.selectedConversationId)
  const selectedRef = useRef(selectedConversationId)
  selectedRef.current = selectedConversationId

  useEffect(() => {
    const socket = getSocket()

    function handleConversationCreated(payload: { conversation: Conversation }) {
      upsertConversation(payload.conversation)
      playNotificationSound()
      // Update badge in title
      const total = useInboxStore.getState().conversations.reduce(
        (sum, c) => sum + c.unreadCount, 0
      )
      updateDocumentTitle(total + 1)
    }

    function handleNewMessage(payload: {
      conversationId: string
      message: Message
    }) {
      appendMessage(payload.conversationId, payload.message)

      // Only increment unread if not currently viewing this conversation
      if (selectedRef.current !== payload.conversationId) {
        incrementUnread(payload.conversationId)
        playNotificationSound()
      }

      // Reorder conversations — move to top
      const conversations = useInboxStore.getState().conversations
      const idx = conversations.findIndex((c) => c.id === payload.conversationId)
      if (idx > 0) {
        const updated = [...conversations]
        const [conv] = updated.splice(idx, 1)
        updated.unshift({
          ...conv,
          lastMessageAt: payload.message.sentAt,
        })
        useInboxStore.getState().setConversations(updated)
      }

      // Update badge
      const total = useInboxStore.getState().conversations.reduce(
        (sum, c) => sum + c.unreadCount, 0
      )
      updateDocumentTitle(total)
    }

    function handleConversationAssigned(payload: {
      conversationId: string
      assignedToId: string
      status: string
    }) {
      const conversations = useInboxStore.getState().conversations
      const conv = conversations.find((c) => c.id === payload.conversationId)
      if (conv) {
        upsertConversation({
          ...conv,
          status: 'OPEN',
          assignedToId: payload.assignedToId,
        })
      }
    }

    function handleConversationClosed(payload: { conversationId: string }) {
      removeConversation(payload.conversationId)
    }

    function handleConversationTransferred(payload: {
      conversationId: string
      assignedToId: string
    }) {
      const conversations = useInboxStore.getState().conversations
      const conv = conversations.find((c) => c.id === payload.conversationId)
      if (conv) {
        upsertConversation({
          ...conv,
          assignedToId: payload.assignedToId,
        })
      }
    }

    function handleMessageStatusUpdated(payload: {
      conversationId: string
      messageId: string
      status: MessageStatus
    }) {
      updateMessageStatus(payload.conversationId, payload.messageId, payload.status)
    }

    // Restore document title when tab gains focus
    function handleVisibilityChange() {
      if (!document.hidden) {
        const total = useInboxStore.getState().conversations.reduce(
          (sum, c) => sum + c.unreadCount, 0
        )
        updateDocumentTitle(total)
      }
    }

    socket.on('conversation:created', handleConversationCreated)
    socket.on('conversation:new_message', handleNewMessage)
    socket.on('conversation:assigned', handleConversationAssigned)
    socket.on('conversation:closed', handleConversationClosed)
    socket.on('conversation:transferred', handleConversationTransferred)
    socket.on('message:status_updated', handleMessageStatusUpdated)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      socket.off('conversation:created', handleConversationCreated)
      socket.off('conversation:new_message', handleNewMessage)
      socket.off('conversation:assigned', handleConversationAssigned)
      socket.off('conversation:closed', handleConversationClosed)
      socket.off('conversation:transferred', handleConversationTransferred)
      socket.off('message:status_updated', handleMessageStatusUpdated)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [upsertConversation, removeConversation, appendMessage, incrementUnread, updateMessageStatus])
}
