import { useCallback } from 'react'
import { apiGet } from '@/lib/api'
import { useInboxStore, type Conversation, type InboxTab } from '@/stores/inbox.store'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from '@/components/ui/toaster'

interface PaginatedResponse<T> {
  data: T
  meta: { page: number; limit: number; total: number; totalPages: number }
}

const ALL_TABS: InboxTab[] = ['pending', 'mine', 'all', 'closed']

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
  const { setConversations, setLoadingConversations, setTabCount } = useInboxStore()

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
        setTabCount(tab, res.meta.total)
      } catch {
        toast({ title: 'Erro ao carregar conversas', variant: 'destructive' })
      } finally {
        setLoadingConversations(false)
      }
    },
    [setConversations, setLoadingConversations, setTabCount],
  )

  const fetchTabCounts = useCallback(async () => {
    const userId = useAuthStore.getState().user?.id
    await Promise.all(
      ALL_TABS.map(async (tab) => {
        try {
          const query = tabToFilters(tab, userId)
          const sep = query ? `?${query}&` : '?'
          const res = await apiGet<PaginatedResponse<Conversation[]>>(
            `inbox/conversations${sep}limit=1`
          )
          setTabCount(tab, res.meta.total)
        } catch {
          // silently ignore count fetch errors
        }
      })
    )
  }, [setTabCount])

  return { fetchConversations, fetchTabCounts }
}
