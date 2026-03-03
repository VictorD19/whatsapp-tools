import { useCallback } from 'react'
import { apiGet, apiPost } from '@/lib/api'
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
  const { setMessages, setLoadingMessages, appendMessage, clearUnread } = useInboxStore()

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
    async (conversationId: string, body: string) => {
      try {
        const res = await apiPost<ApiResponse<Message>>(
          `inbox/conversations/${conversationId}/messages`,
          { body }
        )
        appendMessage(conversationId, res.data)
      } catch {
        toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
      }
    },
    [appendMessage],
  )

  return { fetchMessages, assignConversation, closeConversation, sendMessage }
}
