'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  X,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { formatDateTime } from '@/lib/formatting'
import { apiDelete } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'
import type { ConversationFollowUp, FollowUpType, FollowUpMode, FollowUpStatus } from '@/stores/inbox.store'

const TYPE_ICONS: Record<FollowUpType, React.ElementType> = {
  MESSAGE: MessageSquare,
  CALL: Phone,
  MEETING: Calendar,
  PROPOSAL: FileText,
  PAYMENT: DollarSign,
}

const MODE_STYLES: Record<FollowUpMode, string> = {
  REMINDER: 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300',
  AUTOMATIC: 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-300',
}

const STATUS_STYLES: Record<FollowUpStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  NOTIFIED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SENT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  CANCELLED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

interface FollowUpItemProps {
  followUp: ConversationFollowUp
  onCancelled: () => void
}

export function FollowUpItem({ followUp, onCancelled }: FollowUpItemProps) {
  const t = useTranslations('followUps')
  const tCommon = useTranslations('common')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const TypeIcon = TYPE_ICONS[followUp.type]

  async function handleCancel() {
    setCancelling(true)
    try {
      await apiDelete(`follow-ups/${followUp.id}`)
      toast({ title: t('success.cancelled'), variant: 'success' })
      setConfirmOpen(false)
      onCancelled()
    } catch {
      toast({ title: t('error.cancelling'), variant: 'destructive' })
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <div className="rounded-md border p-2.5 space-y-1.5 bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs font-medium text-foreground truncate">
              {t(`types.${followUp.type}`)}
            </span>
            <Badge
              variant="outline"
              className={cn('text-[9px] px-1.5 py-0', MODE_STYLES[followUp.mode])}
            >
              {t(`modes.${followUp.mode}`)}
            </Badge>
          </div>
          {followUp.status === 'PENDING' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 shrink-0 text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(followUp.scheduledAt)}
          </span>
          <Badge
            variant="secondary"
            className={cn('text-[9px] px-1.5 py-0', STATUS_STYLES[followUp.status])}
          >
            {t(`status.${followUp.status}`)}
          </Badge>
        </div>

        {followUp.message && (
          <p className="text-[11px] text-muted-foreground leading-relaxed truncate">
            {followUp.message}
          </p>
        )}

        <p className="text-[10px] text-muted-foreground/60">
          {followUp.createdBy.name}
        </p>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(v) => !v && setConfirmOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirm.cancel')}</DialogTitle>
            <DialogDescription>{t('confirm.cancelDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {tCommon('back')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              {cancelling ? t('deleting') : tCommon('confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
