'use client'

import React, { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useInboxStore, type InboxTab } from '@/stores/inbox.store'
import { useConversations } from '@/hooks/use-conversations'
import { ConversationListItem } from './conversation-list-item'
import { cn } from '@/lib/utils'

const tabs: { key: InboxTab; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'mine', label: 'Minhas' },
  { key: 'all', label: 'Todas' },
  { key: 'closed', label: 'Encerradas' },
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
    <div className="flex h-full flex-col">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 py-2 text-xs font-medium transition-colors border-b-2',
              activeTab === tab.key
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="pl-8 h-7 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3">
                <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            {search ? 'Nenhum resultado encontrado' : 'Nenhuma conversa nesta aba'}
          </div>
        ) : (
          filtered.map((conv) => (
            <ConversationListItem
              key={conv.id}
              conversation={conv}
              isActive={selectedConversationId === conv.id}
              onClick={() => selectConversation(conv.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
