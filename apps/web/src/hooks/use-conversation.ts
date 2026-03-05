import { useCallback } from 'react'
import { apiGet, apiPost, apiUpload } from '@/lib/api'
import { useInboxStore, type Message } from '@/stores/inbox.store'
import { toast } from '@/components/ui/toaster'

interface PaginatedResponse<T> {
  data: T
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface ApiResponse<T> {
  data: T
}

export function useConversation() {
  const setMessages = useInboxStore((s) => s.setMessages)
  const setLoadingMessages = useInboxStore((s) => s.setLoadingMessages)
  const appendMessage = useInboxStore((s) => s.appendMessage)
  const clearUnread = useInboxStore((s) => s.clearUnread)

  const fetchMessages = useCallback(
    async (conversationId: string, page = 1) => {
      setLoadingMessages(true)
      try {
        const res = await apiGet<PaginatedResponse<Message[]>>(
          `inbox/conversations/${conversationId}/messages?page=${page}&limit=50`
        )
        // API returns newest first, reverse for display (oldest at top)
        const messages = [...res.data].reverse()
        if (page === 1) {
          setMessages(conversationId, messages)
        } else {
          // Prepend older messages
          const existing = useInboxStore.getState().messages[conversationId] ?? []
          setMessages(conversationId, [...messages, ...existing])
        }
        clearUnread(conversationId)
        return res.meta
      } catch {
        toast({ title: 'Erro ao carregar mensagens', variant: 'destructive' })
        return null
      } finally {
        setLoadingMessages(false)
      }
    },
    [setMessages, setLoadingMessages, clearUnread],
  )

  const assignConversation = useCallback(async (conversationId: string) => {
    try {
      await apiPost<ApiResponse<unknown>>(`inbox/conversations/${conversationId}/assign`, {})
      toast({ title: 'Conversa assumida', variant: 'success' })
    } catch {
      toast({ title: 'Erro ao assumir conversa', variant: 'destructive' })
    }
  }, [])

  const closeConversation = useCallback(async (conversationId: string) => {
    try {
      await apiPost<ApiResponse<unknown>>(`inbox/conversations/${conversationId}/close`, {})
      toast({ title: 'Conversa encerrada', variant: 'success' })
    } catch {
      toast({ title: 'Erro ao encerrar conversa', variant: 'destructive' })
    }
  }, [])

  const sendMessage = useCallback(
    async (conversationId: string, body: string, quotedMessageId?: string) => {
      try {
        const payload: Record<string, string> = { body }
        if (quotedMessageId) payload.quotedMessageId = quotedMessageId

        const res = await apiPost<ApiResponse<Message>>(
          `inbox/conversations/${conversationId}/messages`,
          payload,
        )
        appendMessage(conversationId, res.data)
      } catch {
        toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
      }
    },
    [appendMessage],
  )

  const syncMessages = useCallback(async (conversationId: string) => {
    try {
      await apiPost<ApiResponse<{ synced: boolean; newMessages: number }>>(
        `inbox/conversations/${conversationId}/sync`,
        {},
      )
    } catch {
      // Sync is best-effort — don't show errors to user
    }
  }, [])

  const sendMedia = useCallback(
    async (conversationId: string, file: File, caption?: string) => {
      try {
        const formData = new FormData()
        formData.append('file', file)
        if (caption) formData.append('caption', caption)
        const res = await apiUpload<ApiResponse<Message>>(
          `inbox/conversations/${conversationId}/media`,
          formData,
        )
        appendMessage(conversationId, res.data)
      } catch {
        toast({ title: 'Erro ao enviar mídia', variant: 'destructive' })
      }
    },
    [appendMessage],
  )

  return { fetchMessages, assignConversation, closeConversation, sendMessage, syncMessages, sendMedia }
}
