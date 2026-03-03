'use client'

import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, getInitials } from '@/lib/utils'
import type { Conversation } from '@/stores/inbox.store'

interface ConversationListItemProps {
  conversation: Conversation
  isActive: boolean
  onClick: () => void
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Deterministic avatar color from name
function getAvatarColor(name: string) {
  const colors = [
    'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
    'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  ]
  const idx = name.charCodeAt(0) % colors.length
  return colors[idx]
}

export function ConversationListItem({
  conversation,
  isActive,
  onClick,
}: ConversationListItemProps) {
  const contactName = conversation.contact.name ?? conversation.contact.phone
  const hasUnread = conversation.unreadCount > 0
  const preview = conversation.summary
    ?? (conversation.status === 'PENDING' ? 'Aguardando atendimento...' : 'Sem mensagens recentes')

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-lg px-2 py-2.5 text-left transition-all duration-100',
        isActive
          ? 'bg-emerald-50 dark:bg-emerald-500/10'
          : 'hover:bg-muted/60'
      )}
    >
      {/* Active bar */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-emerald-500" />
      )}

      {/* Avatar with WhatsApp badge */}
      <div className="relative shrink-0 mt-0.5">
        <Avatar className="h-9 w-9">
          <AvatarFallback className={cn('text-xs font-semibold', getAvatarColor(contactName))}>
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        {/* WhatsApp badge */}
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#25D366] ring-2 ring-background shadow-sm">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 fill-white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.558 4.119 1.532 5.849L.078 23.5a.5.5 0 0 0 .609.61l5.756-1.507A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.891 0-3.658-.499-5.19-1.37l-.37-.216-3.847 1.007 1.024-3.74-.237-.386A9.955 9.955 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
          </svg>
        </span>
        {/* Online indicator (unread) */}
        {hasUnread && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: name + time */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className={cn(
              'truncate text-[12.5px] leading-tight',
              hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'
            )}
          >
            {contactName}
          </span>
          {conversation.lastMessageAt && (
            <span className="shrink-0 text-[10px] text-muted-foreground/70 tabular-nums">
              {formatRelativeTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>

        {/* Row 2: preview */}
        <p className={cn(
          'truncate text-[11px] leading-snug mb-1',
          hasUnread ? 'text-foreground/70 font-medium' : 'text-muted-foreground'
        )}>
          {preview}
        </p>

        {/* Row 3: meta (instance + assignee) */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium truncate max-w-[90px]">
              {conversation.instance.name}
            </span>
            {conversation.assignedTo && (
              <span className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium truncate max-w-[70px]">
                {conversation.assignedTo.name}
              </span>
            )}
          </div>
          {/* Unread badge */}
          {hasUnread && (
            <span className="shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-white">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
