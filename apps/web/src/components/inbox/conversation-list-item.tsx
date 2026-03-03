'use client'

import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn, getInitials, formatDate, truncate } from '@/lib/utils'
import type { Conversation } from '@/stores/inbox.store'

interface ConversationListItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

export function ConversationListItem({
  conversation,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const contactName = conversation.contact.name ?? conversation.contact.phone

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent',
        isActive && 'bg-accent'
      )}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-xs">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className="text-xs font-semibold truncate">{contactName}</span>
          {conversation.lastMessageAt && (
            <span className="text-[11px] text-muted-foreground shrink-0">
              {formatDate(conversation.lastMessageAt)}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <span className="text-[11px] text-muted-foreground truncate">
            {conversation.summary
              ? truncate(conversation.summary, 35)
              : conversation.status === 'PENDING'
                ? 'Aguardando atendimento...'
                : ''}
          </span>
          {conversation.unreadCount > 0 && (
            <Badge className="h-4 min-w-4 px-1 text-[10px] shrink-0">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-[10px] text-muted-foreground/60">{conversation.instance.name}</span>
          {conversation.assignedTo && (
            <>
              <span className="text-[10px] text-muted-foreground/40">-</span>
              <span className="text-[10px] text-muted-foreground/60">
                {conversation.assignedTo.name}
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  )
}
