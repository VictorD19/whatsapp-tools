'use client'

import { useState, useEffect } from 'react'
import { Check, Eye, EyeOff, FlaskConical, Loader2, Save, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useMetaCapi, type MetaCapiEventRules } from '@/hooks/use-meta-capi'

const EVENT_ITEMS: { key: keyof MetaCapiEventRules; triggerKey: string }[] = [
  { key: 'Lead', triggerKey: 'triggerContactCreated' },
  { key: 'Contact', triggerKey: 'triggerConversationStarted' },
  { key: 'Purchase', triggerKey: 'triggerDealWon' },
  { key: 'Schedule', triggerKey: 'triggerAppointmentConfirmed' },
  { key: 'CompleteRegistration', triggerKey: 'triggerCompleteRegistration' },
]

export function FacebookPixelCard() {
  const t = useTranslations('settings.metaCapi')
  const tCommon = useTranslations('common')

  const { config, loading, saving, testing, save, remove, testEvent } = useMetaCapi()

  const [pixelId, setPixelId] = useState('')
  const [accessToken, setAccessToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [testEventCode, setTestEventCode] = useState('')
  const [eventRules, setEventRules] = useState<MetaCapiEventRules>({
    Lead: true,
    Contact: false,
    Purchase: true,
    Schedule: false,
    CompleteRegistration: false,
  })
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [removing, setRemoving] = useState(false)

  useEffect(() => {
    if (config) {
      setPixelId(config.pixelId)
      setIsActive(config.isActive)
      setTestEventCode(config.testEventCode ?? '')
      setEventRules({ ...eventRules, ...config.eventRules })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const handleSave = async () => {
    if (!pixelId.trim()) return
    if (!config && !accessToken.trim()) return
    await save({
      pixelId: pixelId.trim(),
      accessToken: accessToken.trim() || '_unchanged_',
      isActive,
      eventRules,
      testEventCode: testEventCode.trim() || null,
    })
    setAccessToken('')
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await remove()
      setPixelId('')
      setAccessToken('')
    } finally {
      setRemoving(false)
      setShowRemoveDialog(false)
    }
  }

  const toggleEvent = (key: keyof MetaCapiEventRules) => {
    setEventRules((prev) => ({ ...prev, [key]: !prev[key] }))
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
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 py-1">
        <div className="flex items-center gap-3.5">
          <div className="h-9 w-9 rounded-lg bg-[#1877F2]/10 border border-[#1877F2]/20 flex items-center justify-center shrink-0">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#1877F2]">
              <path d="M24 12.073C24 5.404 18.627 0 12 0S0 5.404 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">Meta Pixel (CAPI)</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                {t('categoryMarketing')}
              </span>
              {config?.isActive && (
                <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                  <Check className="h-2.5 w-2.5" />
                  {t('connected')}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config ? `Pixel ID: ${config.pixelId}` : t('description')}
            </p>
          </div>
        </div>

        {config && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 pr-2"
              onClick={testEvent}
              disabled={testing}
            >
              {testing
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <FlaskConical className="h-3 w-3" />}
              {t('testEvent')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-7 gap-1 pr-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
              onClick={() => setShowRemoveDialog(true)}
            >
              <Trash2 className="h-3 w-3" />
              {tCommon('delete')}
            </Button>
          </div>
        )}
      </div>

      {/* Config form */}
      <div className="mt-4 space-y-4 pl-[52px]">
        {/* Active toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">{t('enableIntegration')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('enableIntegrationHint')}</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>

        <div className="h-px bg-border" />

        {/* Credentials */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('pixelId')}
            </Label>
            <Input
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
              placeholder={t('pixelIdPlaceholder')}
              className="h-9 font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('accessToken')}
            </Label>
            <div className="relative">
              <Input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={config ? t('accessTokenMasked') : t('accessTokenPlaceholder')}
                type={showToken ? 'text' : 'password'}
                className="h-9 font-mono text-sm pr-9"
              />
              <button
                type="button"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowToken((v) => !v)}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {config && (
              <p className="text-xs text-muted-foreground">{t('accessTokenHint')}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('testEventCode')}
            </Label>
            <Input
              value={testEventCode}
              onChange={(e) => setTestEventCode(e.target.value)}
              placeholder={t('testEventCodePlaceholder')}
              className="h-9 font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">{t('testEventCodeHint')}</p>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Event rules */}
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">{t('eventRules')}</p>
          <p className="text-xs text-muted-foreground mb-4">{t('eventRulesDescription')}</p>
          <div className="space-y-4">
            {EVENT_ITEMS.map(({ key, triggerKey }) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">{key}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t(triggerKey)}</p>
                </div>
                <Switch
                  checked={!!eventRules[key]}
                  onCheckedChange={() => toggleEvent(key)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || !pixelId.trim() || (!config && !accessToken.trim())}
            className="gap-1.5"
          >
            {saving
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />{t('saving')}</>
              : <><Save className="h-3.5 w-3.5" />{tCommon('save')}</>}
          </Button>
        </div>
      </div>

      {/* Remove dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={(v) => !v && setShowRemoveDialog(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmRemove')}</DialogTitle>
            <DialogDescription>{t('confirmRemoveDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={removing}>
              {removing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
              {removing ? t('removing') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
