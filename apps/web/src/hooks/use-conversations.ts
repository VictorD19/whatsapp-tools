import { useCallback } from 'react'
import { apiGet } from '@/lib/api'
import { useInboxStore, type Conversation, type InboxTab } from '@/stores/inbox.store'
import { toast } from '@/components/ui/toaster'

interface PaginatedResponse<T> {
  data: T
  meta: { page: number; limit: number; total: number; totalPages: number }
}

const ALL_TABS: InboxTab[] = ['all', 'mine', 'unassigned']

function tabToFilters(tab: InboxTab) {
  return `tab=${tab}`
}

export function useConversations() {
  const { setConversations, setLoadingConversations, setTabCount } = useInboxStore()

  const fetchConversations = useCallback(
    async (tab: InboxTab) => {
      setLoadingConversations(true)
      try {
        const query = tabToFilters(tab)
        const res = await apiGet<PaginatedResponse<Conversation[]>>(
          `inbox/conversations?${query}`
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
    await Promise.all(
      ALL_TABS.map(async (tab) => {
        try {
          const query = tabToFilters(tab)
          const res = await apiGet<PaginatedResponse<Conversation[]>>(
            `inbox/conversations?${query}&limit=1`
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
