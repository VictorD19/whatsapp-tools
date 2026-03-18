'use client'

import React, { useEffect, useState } from 'react'
import { RefreshCw, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import type { Instance } from '@/stores/instances.store'

interface AssistantOption {
  id: string
  name: string
  isActive: boolean
}

interface InstanceSettingsSheetProps {
  instance: Instance | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, data: { name?: string; defaultAssistantId?: string | null }) => Promise<unknown>
  onSync: (id: string) => void
  onDelete: (id: string) => void
  assistants: AssistantOption[]
}

export function InstanceSettingsSheet({
  instance,
  open,
  onOpenChange,
  onUpdate,
  onSync,
  onDelete,
  assistants,
}: InstanceSettingsSheetProps) {
  const t = useTranslations('instances')
  const tCommon = useTranslations('common')

  const [name, setName] = useState('')
  const [defaultAssistantId, setDefaultAssistantId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (instance) {
      setName(instance.name)
      setDefaultAssistantId(instance.defaultAssistantId)
    }
  }, [instance])

  const handleSave = async () => {
    if (!instance) return
    setSaving(true)
    try {
      await onUpdate(instance.id, { name, defaultAssistantId })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = () => {
    if (!instance) return
    onSync(instance.id)
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (!instance) return
    onDelete(instance.id)
    onOpenChange(false)
  }

  const activeAssistants = assistants.filter((a) => a.isActive)

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onOpenChange(false)}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('sheetTitle')}</SheetTitle>
          <SheetDescription>{instance?.name}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="instance-name">{t('sheetNameLabel')}</Label>
            <Input
              id="instance-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('sheetNamePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('sheetDefaultAssistant')}</Label>
            <Select
              value={defaultAssistantId ?? 'none'}
              onValueChange={(v) => setDefaultAssistantId(v === 'none' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('sheetDefaultAssistantPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('sheetDefaultAssistantPlaceholder')}</SelectItem>
                {activeAssistants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t('sheetDefaultAssistantHint')}</p>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('sheetActions')}</p>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={handleSync}
            >
              <RefreshCw className="h-4 w-4" />
              {t('sheetSync')}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
              {t('sheetRemove')}
            </Button>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? tCommon('loading') : tCommon('save')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
