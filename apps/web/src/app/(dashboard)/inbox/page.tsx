'use client'

import React, { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Inbox as InboxIcon, ArrowLeft } from 'lucide-react'
import { ConversationList } from '@/components/inbox/conversation-list'
import { MessageThread } from '@/components/inbox/message-thread'
import { ContactPanel } from '@/components/inbox/contact-panel'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { useInboxStore, type Conversation } from '@/stores/inbox.store'
import { useInboxSocket } from '@/hooks/use-inbox-socket'
import { apiGet } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function InboxPage() {
  React.useEffect(() => { document.title = 'Inbox | SistemaZapChat' }, [])

  const searchParams = useSearchParams()
  const selectedId = useInboxStore((s) => s.selectedConversationId)
  const conversations = useInboxStore((s) => s.conversations)
  const selectConversation = useInboxStore((s) => s.selectConversation)
  const upsertConversation = useInboxStore((s) => s.upsertConversation)
  const selectedConversation = selectedId
    ? conversations.find((c) => c.id === selectedId) ?? null
    : null

  // Socket for real-time updates
  useInboxSocket()

  // Handle ?conversationId= from external navigation (e.g. CRM)
  useEffect(() => {
    const targetId = searchParams.get('conversationId')
    if (!targetId) return

    // Already selected
    if (selectedId === targetId) return

    // If conversation is in the list, just select it
    if (conversations.some((c) => c.id === targetId)) {
      selectConversation(targetId)
      return
    }

    // Fetch conversation from API and upsert into store
    let cancelled = false
    ;(async () => {
      try {
        const conv = await apiGet<Conversation>(`inbox/conversations/${targetId}`)
        if (!cancelled && conv?.id) {
          upsertConversation(conv)
          selectConversation(targetId)
        }
      } catch {
        // Conversation may not exist or not belong to this tenant
      }
    })()

    return () => { cancelled = true }
  }, [searchParams, selectedId, conversations, selectConversation, upsertConversation])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation list */}
      <div
        className={cn(
          'w-full sm:w-[280px] shrink-0 border-r border-border overflow-y-auto',
          // On mobile, hide when a conversation is selected
          selectedId ? 'hidden sm:block' : 'block'
        )}
      >
        <ConversationList />
      </div>

      {/* Center: Message thread */}
      <div
        className={cn(
          'flex-1 overflow-hidden flex flex-col',
          // On mobile, only show when a conversation is selected
          !selectedId ? 'hidden sm:flex' : 'flex'
        )}
      >
        {selectedConversation ? (
          <>
            {/* Mobile back button */}
            <div className="sm:hidden border-b border-border px-2 py-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => selectConversation(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Button>
            </div>
            <MessageThread conversation={selectedConversation} />
          </>
        ) : (
          <EmptyState
            icon={InboxIcon}
            title="Selecione uma conversa"
            description="Escolha uma conversa na lista ao lado para comecar"
            className="flex-1"
          />
        )}
      </div>

      {/* Right: Contact info — only when a conversation is open */}
      {selectedConversation && (
        <div className="w-[320px] shrink-0 border-l border-border hidden xl:block overflow-y-auto">
          <ContactPanel conversation={selectedConversation} />
        </div>
      )}
    </div>
  )
}
