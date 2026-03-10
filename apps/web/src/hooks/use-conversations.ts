import { useCallback } from 'react'
import { useTranslations } from 'next-intl'
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
  const t = useTranslations('inbox')
  const {
    setConversations,
    appendConversations,
    setLoadingConversations,
    setLoadingMoreConversations,
    setTabCount,
    conversationsPagination,
  } = useInboxStore()

  const fetchConversations = useCallback(
    async (tab: InboxTab) => {
      setLoadingConversations(true)
      try {
        const query = tabToFilters(tab)
        const res = await apiGet<PaginatedResponse<Conversation[]>>(
          `inbox/conversations?${query}&page=1&limit=20`
        )
        const pagination = {
          page: res.meta.page,
          totalPages: res.meta.totalPages,
          total: res.meta.total,
          hasMore: res.meta.page < res.meta.totalPages,
        }
        setConversations(res.data, pagination)
        setTabCount(tab, res.meta.total)
      } catch {
        toast({ title: t('errorLoadingConversations'), variant: 'destructive' })
      } finally {
        setLoadingConversations(false)
      }
    },
    [setConversations, setLoadingConversations, setTabCount],
  )

  const fetchMoreConversations = useCallback(
    async (tab: InboxTab) => {
      const { page, hasMore } = useInboxStore.getState().conversationsPagination
      if (!hasMore) return

      setLoadingMoreConversations(true)
      try {
        const nextPage = page + 1
        const query = tabToFilters(tab)
        const res = await apiGet<PaginatedResponse<Conversation[]>>(
          `inbox/conversations?${query}&page=${nextPage}&limit=20`
        )
        const pagination = {
          page: res.meta.page,
          totalPages: res.meta.totalPages,
          total: res.meta.total,
          hasMore: res.meta.page < res.meta.totalPages,
        }
        appendConversations(res.data, pagination)
      } catch {
        toast({ title: t('errorLoadingMore'), variant: 'destructive' })
      } finally {
        setLoadingMoreConversations(false)
      }
    },
    [appendConversations, setLoadingMoreConversations],
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

  return { fetchConversations, fetchMoreConversations, fetchTabCounts }
}
