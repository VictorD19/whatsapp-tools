import React from 'react'
import { Inbox as InboxIcon } from 'lucide-react'
import type { Metadata } from 'next'
import { ConversationList } from '@/components/inbox/conversation-list'
import { ContactPanel } from '@/components/inbox/contact-panel'
import { EmptyState } from '@/components/shared/empty-state'

export const metadata: Metadata = { title: 'Inbox' }

export default function InboxPage() {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Conversation list */}
      <div className="w-[280px] shrink-0 border-r border-border overflow-y-auto">
        <ConversationList />
      </div>

      {/* Center: Message thread */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <EmptyState
          icon={InboxIcon}
          title="Selecione uma conversa"
          description="Escolha uma conversa na lista ao lado para começar"
          className="flex-1"
        />
      </div>

      {/* Right: Contact info */}
      <div className="w-[320px] shrink-0 border-l border-border hidden xl:block overflow-y-auto">
        <ContactPanel />
      </div>
    </div>
  )
}
