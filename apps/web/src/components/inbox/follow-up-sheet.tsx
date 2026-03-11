'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  Loader2,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { apiPost } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { FollowUpType, FollowUpMode } from '@/stores/inbox.store'

const FOLLOW_UP_TYPES: { value: FollowUpType; emoji: string }[] = [
  { value: 'MESSAGE', emoji: '\u{1F4AC}' },
  { value: 'CALL', emoji: '\u{1F4DE}' },
  { value: 'MEETING', emoji: '\u{1F4C5}' },
  { value: 'PROPOSAL', emoji: '\u{1F4C4}' },
  { value: 'PAYMENT', emoji: '\u{1F4B0}' },
]

interface FollowUpSheetProps {
  open: boolean
  onClose: () => void
  conversationId: string
  onCreated: () => void
}

export function FollowUpSheet({ open, onClose, conversationId, onCreated }: FollowUpSheetProps) {
  const t = useTranslations('followUps')
  const tCommon = useTranslations('common')

  const [type, setType] = useState<FollowUpType>('MESSAGE')
  const [mode, setMode] = useState<FollowUpMode>('REMINDER')
  const [dateValue, setDateValue] = useState('')
  const [timeValue, setTimeValue] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setType('MESSAGE')
    setMode('REMINDER')
    setDateValue('')
    setTimeValue('')
    setMessage('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function isValid(): boolean {
    if (!dateValue || !timeValue) return false
    const scheduledAt = new Date(`${dateValue}T${timeValue}`)
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return false
    if (mode === 'AUTOMATIC' && !message.trim()) return false
    return true
  }

  async function handleSubmit() {
    if (!isValid()) return

    const scheduledAt = new Date(`${dateValue}T${timeValue}`).toISOString()

    setSaving(true)
    try {
      await apiPost(`conversations/${conversationId}/follow-ups`, {
        type,
        mode,
        scheduledAt,
        message: mode === 'AUTOMATIC' ? message.trim() : message.trim() || null,
      })
      toast({ title: t('success.created'), variant: 'success' })
      handleClose()
      onCreated()
    } catch {
      toast({ title: t('error.creating'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // Default date/time to tomorrow at 10:00
  function getMinDate(): string {
    const now = new Date()
    return now.toISOString().split('T')[0]
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('new')}</SheetTitle>
          <SheetDescription>{t('emptyHint')}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Type */}
          <div className="space-y-2">
            <Label>{t('fields.type')}</Label>
            <Select value={type} onValueChange={(v) => setType(v as FollowUpType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FOLLOW_UP_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    <span className="flex items-center gap-2">
                      <span>{ft.emoji}</span>
                      <span>{t(`types.${ft.value}`)}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode */}
          <div className="space-y-2">
            <Label>{t('fields.mode')}</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as FollowUpMode)} className="space-y-2">
              <div className="flex items-start space-x-3 rounded-md border p-3">
                <RadioGroupItem value="REMINDER" id="mode-reminder" className="mt-0.5" />
                <div className="space-y-0.5">
                  <label htmlFor="mode-reminder" className="text-sm font-medium cursor-pointer">
                    {t('modes.REMINDER')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('modes.REMINDER_hint')}
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 rounded-md border p-3">
                <RadioGroupItem value="AUTOMATIC" id="mode-automatic" className="mt-0.5" />
                <div className="space-y-0.5">
                  <label htmlFor="mode-automatic" className="text-sm font-medium cursor-pointer">
                    {t('modes.AUTOMATIC')}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {t('modes.AUTOMATIC_hint')}
                  </p>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Date + Time */}
          <div className="space-y-2">
            <Label>{t('fields.scheduledAt')}</Label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                min={getMinDate()}
                className="flex-1"
              />
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-28"
              />
            </div>
          </div>

          {/* Message (conditional for AUTOMATIC, optional for REMINDER) */}
          <div className="space-y-2">
            <Label>
              {t('fields.message')}
              {mode === 'AUTOMATIC' && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                mode === 'AUTOMATIC'
                  ? t('fields.message')
                  : t('fields.message')
              }
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleClose}>
            {tCommon('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !isValid()}>
            {saving ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                {t('saving')}
              </>
            ) : (
              tCommon('save')
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
