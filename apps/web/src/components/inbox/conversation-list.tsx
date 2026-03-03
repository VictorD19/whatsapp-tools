'use client'

import React, { useEffect, useState } from 'react'
import { Search, SlidersHorizontal, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useInboxStore, type InboxTab } from '@/stores/inbox.store'
import { useConversations } from '@/hooks/use-conversations'
import { ConversationListItem } from './conversation-list-item'
import { cn } from '@/lib/utils'

const tabs: { key: InboxTab; label: string; shortLabel: string }[] = [
  { key: 'pending', label: 'Pendentes', shortLabel: 'Pend.' },
  { key: 'mine', label: 'Minhas', shortLabel: 'Minhas' },
  { key: 'all', label: 'Todas', shortLabel: 'Todas' },
  { key: 'closed', label: 'Encerradas', shortLabel: 'Enc.' },
]

export function ConversationList() {
  const [search, setSearch] = useState('')
  const activeTab = useInboxStore((s) => s.activeTab)
  const setActiveTab = useInboxStore((s) => s.setActiveTab)
  const conversations = useInboxStore((s) => s.conversations)
  const isLoading = useInboxStore((s) => s.isLoadingConversations)
  const selectedConversationId = useInboxStore((s) => s.selectedConversationId)
  const selectConversation = useInboxStore((s) => s.selectConversation)
  const { fetchConversations } = useConversations()

  useEffect(() => {
    fetchConversations(activeTab)
  }, [activeTab, fetchConversations])

  const filtered = search
    ? conversations.filter((c) => {
        const name = c.contact.name ?? c.contact.phone
        return name.toLowerCase().includes(search.toLowerCase())
      })
    : conversations

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-border px-3 shrink-0">
        <h2 className="text-[13px] font-semibold text-foreground">Conversas</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Tab pills */}
      <div className="px-3 pt-2.5 pb-2 shrink-0">
        <div className="flex gap-1.5 rounded-lg bg-muted/60 p-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            const count = isActive ? filtered.length : 0
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-all duration-150',
                  isActive
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/50'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.shortLabel}</span>
                {isActive && count > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white leading-none">
                    {count > 99 ? '99+' : count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="pl-7 h-7 text-xs bg-muted/40 border-transparent focus-visible:border-border focus-visible:bg-background rounded-lg placeholder:text-muted-foreground/60"
          />
        </div>
      </div>

      {/* Count + sort hint */}
      {!isLoading && filtered.length > 0 && (
        <div className="px-3 pb-1.5 shrink-0">
          <p className="text-[10px] text-muted-foreground/60">
            {filtered.length} {filtered.length === 1 ? 'conversa' : 'conversas'}
          </p>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-px px-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg p-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5 pt-0.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-2.5 w-20" />
                    <Skeleton className="h-2 w-10" />
                  </div>
                  <Skeleton className="h-2.5 w-36" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
              <Search className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">
              {search ? 'Nenhum resultado' : 'Nenhuma conversa aqui'}
            </p>
            {!search && (
              <p className="text-[11px] text-muted-foreground/60">
                As conversas aparecerão aqui quando chegarem
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-px px-1 pb-2">
            {filtered.map((conv) => (
              <ConversationListItem
                key={conv.id}
                conversation={conv}
                isActive={selectedConversationId === conv.id}
                onClick={() => selectConversation(conv.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
