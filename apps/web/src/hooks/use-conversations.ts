import { useCallback } from 'react'
import { apiGet } from '@/lib/api'
import { useInboxStore, type Conversation, type InboxTab } from '@/stores/inbox.store'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from '@/components/ui/toaster'

interface PaginatedResponse<T> {
  data: T
  meta: { page: number; limit: number; total: number; totalPages: number }
}

function tabToFilters(tab: InboxTab, userId: string | undefined) {
  const params = new URLSearchParams()
  switch (tab) {
    case 'pending':
      params.set('status', 'PENDING')
      break
    case 'mine':
      params.set('status', 'OPEN')
      if (userId) params.set('assignedToId', userId)
      break
    case 'all':
      // no status filter
      break
    case 'closed':
      params.set('status', 'CLOSE')
      break
  }
  return params.toString()
}

export function useConversations() {
  const { setConversations, setLoadingConversations } = useInboxStore()

  const fetchConversations = useCallback(
    async (tab: InboxTab) => {
      setLoadingConversations(true)
      try {
        const userId = useAuthStore.getState().user?.id
        const query = tabToFilters(tab, userId)
        const res = await apiGet<PaginatedResponse<Conversation[]>>(
          `inbox/conversations${query ? `?${query}` : ''}`
        )
        setConversations(res.data)
      } catch {
        toast({ title: 'Erro ao carregar conversas', variant: 'destructive' })
      } finally {
        setLoadingConversations(false)
      }
    },
    [setConversations, setLoadingConversations],
  )

  return { fetchConversations }
}
