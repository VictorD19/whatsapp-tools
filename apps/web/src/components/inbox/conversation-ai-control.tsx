'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bot, BotOff, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { apiPatch } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { useInboxStore } from '@/stores/inbox.store'
import type { Conversation } from '@/stores/inbox.store'
import { cn } from '@/lib/utils'

interface ConversationAiControlProps {
  conversation: Conversation
}

export function ConversationAiControl({ conversation }: ConversationAiControlProps) {
  const t = useTranslations('inbox.ai')
  const upsertConversation = useInboxStore((s) => s.upsertConversation)
  const [open, setOpen] = useState(false)
  const [updating, setUpdating] = useState(false)

  const hasAi = !!conversation.instance.defaultAssistantId
  const isPaused = !!conversation.assistantPausedAt
  const isActive = hasAi && !isPaused

  // No assistant configured on instance — render nothing
  if (!hasAi) return null

  async function togglePause(paused: boolean) {
    setUpdating(true)
    try {
      await apiPatch<{ data: { conversationId: string; paused: boolean } }>(
        `inbox/conversations/${conversation.id}/assistant`,
        { paused },
      )
      // Merge locally — endpoint returns only { conversationId, paused }, not full Conversation
      upsertConversation({
        ...conversation,
        assistantPausedAt: paused ? new Date().toISOString() : null,
      })
      toast({
        title: paused ? t('paused') : t('activated'),
        variant: 'success',
      })
      setOpen(false)
    } catch {
      toast({ title: t('errorUpdating'), variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5">
          <Badge
            variant="secondary"
            className={cn(
              'text-[10px] gap-1 cursor-pointer transition-colors',
              isActive
                ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {isActive ? (
              <Bot className="h-3 w-3" />
            ) : (
              <BotOff className="h-3 w-3" />
            )}
            {isActive ? t('active') : t('paused')}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-48 p-1">
        {conversation.instance.defaultAssistant && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
            {conversation.instance.defaultAssistant.avatarEmoji && (
              <span className="mr-1">{conversation.instance.defaultAssistant.avatarEmoji}</span>
            )}
            {conversation.instance.defaultAssistant.name}
          </div>
        )}

        {updating ? (
          <div className="flex items-center justify-center py-3">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : isActive ? (
          <button
            onClick={() => togglePause(true)}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <BotOff className="h-3.5 w-3.5" />
            {t('pauseAi')}
          </button>
        ) : (
          <button
            onClick={() => togglePause(false)}
            className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors text-left"
          >
            <Bot className="h-3.5 w-3.5" />
            {t('resumeAi')}
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
