'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPatch } from '@/lib/api'

interface AssistantSettings {
  openaiApiKey: string | null
  hasApiKey: boolean
}

interface ApiResponse<T> {
  data: T
}

const SETTINGS_QUERY_KEY = ['assistants', 'settings']

interface AssistantSettingsSheetProps {
  open: boolean
  onClose: () => void
}

export function AssistantSettingsSheet({ open, onClose }: AssistantSettingsSheetProps) {
  const t = useTranslations('assistants')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()

  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<AssistantSettings>>('assistants/settings').then((r) => r.data),
    enabled: open,
  })

  useEffect(() => {
    if (open && settings) {
      setApiKey(settings.openaiApiKey ?? '')
      setDirty(false)
      setShowKey(false)
    }
  }, [open, settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPatch<ApiResponse<AssistantSettings>>('assistants/settings', {
        openaiApiKey: apiKey.trim() || null,
      })
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY })
      toast({ title: t('settings.success.saved'), variant: 'success' })
      setDirty(false)
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('settings.error.saving')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('settings.title')}</SheetTitle>
          <SheetDescription>{t('settings.description')}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="openai-api-key">{t('settings.openaiApiKeyLabel')}</Label>
            <div className="relative">
              <Input
                id="openai-api-key"
                type={showKey ? 'text' : 'password'}
                placeholder={t('settings.openaiApiKeyPlaceholder')}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setDirty(true)
                }}
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t('settings.openaiApiKeyHint')}</p>
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? t('settings.saving') : tCommon('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
