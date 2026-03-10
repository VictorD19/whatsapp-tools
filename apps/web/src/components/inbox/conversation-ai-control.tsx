'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Bot, BotOff, ChevronDown, Loader2, Power, RefreshCw, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { apiGet, apiPatch } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { useInboxStore } from '@/stores/inbox.store'
import type { Conversation } from '@/stores/inbox.store'
import { cn } from '@/lib/utils'

interface Assistant {
  id: string
  name: string
  description: string | null
  avatarEmoji: string | null
  isActive: boolean
}

interface ConversationAiControlProps {
  conversation: Conversation
}

export function ConversationAiControl({ conversation }: ConversationAiControlProps) {
  const t = useTranslations('inbox.ai')
  const upsertConversation = useInboxStore((s) => s.upsertConversation)
  const [open, setOpen] = useState(false)
  const [assistants, setAssistants] = useState<Assistant[]>([])
  const [loadingAssistants, setLoadingAssistants] = useState(false)
  const [loadedOnce, setLoadedOnce] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [showSelector, setShowSelector] = useState(false)

  const hasAssistant = !!conversation.assistantId
  const isPaused = !!conversation.assistantPausedAt
  const isActive = hasAssistant && !isPaused

  async function fetchAssistants() {
    if (loadedOnce) return
    setLoadingAssistants(true)
    try {
      const res = await apiGet<{ data: Assistant[] }>('assistants')
      setAssistants(res.data.filter((a) => a.isActive))
      setLoadedOnce(true)
    } catch {
      toast({ title: t('errorLoadingAssistants'), variant: 'destructive' })
    } finally {
      setLoadingAssistants(false)
    }
  }

  async function setAssistant(assistantId: string | null) {
    setUpdating(true)
    try {
      const res = await apiPatch<{ data: Conversation }>(
        `inbox/conversations/${conversation.id}/assistant`,
        { assistantId },
      )
      upsertConversation(res.data)
      toast({
        title: assistantId ? t('activated') : t('removed'),
        variant: 'success',
      })
      setOpen(false)
      setShowSelector(false)
    } catch {
      toast({ title: t('errorUpdating'), variant: 'destructive' })
    } finally {
      setUpdating(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (isOpen) {
      fetchAssistants()
      setShowSelector(false)
    }
  }

  // No assistant: show a subtle button to activate
  if (!hasAssistant) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('label')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-64 p-0">
          <AssistantSelector
            assistants={assistants}
            loading={loadingAssistants}
            updating={updating}
            onSelect={(id) => setAssistant(id)}
          />
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 group">
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
            <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 p-1">
        {showSelector ? (
          <AssistantSelector
            assistants={assistants}
            loading={loadingAssistants}
            updating={updating}
            onSelect={(id) => setAssistant(id)}
            currentAssistantId={conversation.assistantId}
          />
        ) : (
          <div className="space-y-0.5">
            {/* Current assistant info */}
            {conversation.assistant && (
              <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                {conversation.assistant.avatarEmoji && (
                  <span className="mr-1">{conversation.assistant.avatarEmoji}</span>
                )}
                {conversation.assistant.name}
              </div>
            )}

            {isActive ? (
              <>
                <PopoverMenuItem
                  icon={<BotOff className="h-3.5 w-3.5" />}
                  label={t('pauseAi')}
                  onClick={() => setAssistant(null)}
                  disabled={updating}
                />
                <PopoverMenuItem
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  label={t('switchAssistant')}
                  onClick={() => setShowSelector(true)}
                  disabled={updating}
                />
              </>
            ) : (
              <>
                <PopoverMenuItem
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label={t('resumeAi')}
                  description={t('resumeDescription')}
                  onClick={() => {
                    // Re-activate by setting the same assistant
                    if (conversation.assistantId) setAssistant(conversation.assistantId)
                  }}
                  disabled={updating}
                />
                <PopoverMenuItem
                  icon={<Power className="h-3.5 w-3.5 text-destructive" />}
                  label={t('disableAi')}
                  onClick={() => setAssistant(null)}
                  disabled={updating}
                  destructive
                />
                <PopoverMenuItem
                  icon={<RefreshCw className="h-3.5 w-3.5" />}
                  label={t('switchAssistant')}
                  onClick={() => setShowSelector(true)}
                  disabled={updating}
                />
              </>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

function PopoverMenuItem({
  icon,
  label,
  description,
  onClick,
  disabled,
  destructive,
}: {
  icon: React.ReactNode
  label: string
  description?: string
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors text-left',
        'hover:bg-muted disabled:opacity-50 disabled:pointer-events-none',
        destructive && 'text-destructive hover:bg-destructive/10',
      )}
    >
      {icon}
      <div>
        <span>{label}</span>
        {description && (
          <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
    </button>
  )
}

function AssistantSelector({
  assistants,
  loading,
  updating,
  onSelect,
  currentAssistantId,
}: {
  assistants: Assistant[]
  loading: boolean
  updating: boolean
  onSelect: (id: string) => void
  currentAssistantId?: string | null
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const t = useTranslations('inbox.ai')

  if (assistants.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <Bot className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-xs text-muted-foreground">{t('noAssistants')}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          {t('createAssistant')}
        </p>
      </div>
    )
  }

  return (
    <div className="p-1">
      <p className="px-2 py-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
        {t('selectAssistant')}
      </p>
      <div className="space-y-0.5 max-h-48 overflow-y-auto">
        {assistants.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            disabled={updating || a.id === currentAssistantId}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-xs transition-colors text-left',
              'hover:bg-muted disabled:opacity-50',
              a.id === currentAssistantId && 'bg-muted',
            )}
          >
            <span className="shrink-0 text-sm">
              {a.avatarEmoji ?? '🤖'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{a.name}</p>
              {a.description && (
                <p className="text-[10px] text-muted-foreground truncate">{a.description}</p>
              )}
            </div>
            {updating && a.id === currentAssistantId && (
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
