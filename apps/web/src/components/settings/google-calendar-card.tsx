'use client'

import { useState } from 'react'
import { Check, ExternalLink, Loader2, Unplug } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Integration {
  id: string
  provider: string
  providerAccountId: string
  isActive: boolean
  tokenExpiresAt: string | null
  createdAt: string
}

interface GoogleCalendarCardProps {
  integration: Integration | undefined
  onConnect: () => void
  onDisconnect: (id: string) => Promise<void>
  loading: boolean
}

export function GoogleCalendarCard({
  integration,
  onConnect,
  onDisconnect,
  loading,
}: GoogleCalendarCardProps) {
  const t = useTranslations('settings.integrations')
  const tCommon = useTranslations('common')
  const [disconnecting, setDisconnecting] = useState(false)
  const [showDialog, setShowDialog] = useState(false)

  const isExpired = integration?.tokenExpiresAt
    ? new Date(integration.tokenExpiresAt) < new Date()
    : false

  const handleDisconnect = async () => {
    setDisconnecting(true)
    try {
      await onDisconnect(integration!.id)
    } finally {
      setDisconnecting(false)
      setShowDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-3.5 py-1">
        <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{tCommon('loading')}</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center text-lg shrink-0">
            📅
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Google Calendar</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                {t('productivity')}
              </span>
              {integration?.isActive && !isExpired && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5" />
                  {t('connected')}
                </span>
              )}
              {isExpired && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  {t('expired')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {integration?.isActive
                ? integration.providerAccountId
                : t('googleCalendar')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {integration?.isActive ? (
            <>
              <a
                href={`https://calendar.google.com/calendar/r?authuser=${integration.providerAccountId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7 gap-1 pr-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
                onClick={() => setShowDialog(true)}
              >
                <Unplug className="h-3 w-3" />
                {t('disconnect')}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 pr-2"
              onClick={onConnect}
            >
              {t('connect')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={(v) => !v && setShowDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmDisconnect')}</DialogTitle>
            <DialogDescription>{t('confirmDisconnectDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {disconnecting ? tCommon('loading') : t('disconnect')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
