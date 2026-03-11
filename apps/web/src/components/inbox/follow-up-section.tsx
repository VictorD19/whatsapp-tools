'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Clock, Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { apiGet } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { FollowUpItem } from './follow-up-item'
import { FollowUpSheet } from './follow-up-sheet'
import type { ConversationFollowUp } from '@/stores/inbox.store'

interface FollowUpSectionProps {
  conversationId: string
}

export function FollowUpSection({ conversationId }: FollowUpSectionProps) {
  const t = useTranslations('followUps')
  const [followUps, setFollowUps] = useState<ConversationFollowUp[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)

  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await apiGet<{ data: ConversationFollowUp[] }>(
        `conversations/${conversationId}/follow-ups`,
      )
      setFollowUps(res.data)
    } catch {
      toast({ title: t('error.loading'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [conversationId, t])

  useEffect(() => {
    setLoading(true)
    fetchFollowUps()
  }, [fetchFollowUps])

  function handleCreated() {
    fetchFollowUps()
  }

  function handleCancelled(id: string) {
    setFollowUps((prev) => prev.filter((fu) => fu.id !== id))
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{t('title')}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : followUps.length > 0 ? (
        <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
          {followUps.map((fu) => (
            <FollowUpItem
              key={fu.id}
              followUp={fu}
              onCancelled={handleCancelled}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-[11px] text-muted-foreground/60">{t('empty')}</p>
          <p className="text-[10px] text-muted-foreground/40 mt-0.5">{t('emptyHint')}</p>
        </div>
      )}

      {/* Sheet */}
      <FollowUpSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        conversationId={conversationId}
        onCreated={handleCreated}
      />
    </div>
  )
}
