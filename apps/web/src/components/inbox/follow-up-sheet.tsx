'use client'

import React, { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  MessageSquare,
  Phone,
  Calendar,
  FileText,
  DollarSign,
  Loader2,
  Paperclip,
  X,
  Image,
  Music,
  Film,
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
import { api } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import type { FollowUpType, FollowUpMode } from '@/stores/inbox.store'

const FOLLOW_UP_TYPES: { value: FollowUpType; emoji: string }[] = [
  { value: 'MESSAGE', emoji: '\u{1F4AC}' },
  { value: 'CALL', emoji: '\u{1F4DE}' },
  { value: 'MEETING', emoji: '\u{1F4C5}' },
  { value: 'PROPOSAL', emoji: '\u{1F4C4}' },
  { value: 'PAYMENT', emoji: '\u{1F4B0}' },
]

const ACCEPTED_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/avi', 'video/quicktime', 'video/3gpp',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/mp4',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip', 'text/plain',
].join(',')

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return Image
  if (file.type.startsWith('video/')) return Film
  if (file.type.startsWith('audio/')) return Music
  return FileText
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface FollowUpSheetProps {
  open: boolean
  onClose: () => void
  conversationId: string
  onCreated: () => void
}

export function FollowUpSheet({ open, onClose, conversationId, onCreated }: FollowUpSheetProps) {
  const t = useTranslations('followUps')
  const tCommon = useTranslations('common')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [type, setType] = useState<FollowUpType>('MESSAGE')
  const [mode, setMode] = useState<FollowUpMode>('REMINDER')
  const [dateValue, setDateValue] = useState(() => new Date().toISOString().split('T')[0])
  const [timeValue, setTimeValue] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [message, setMessage] = useState('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  function resetForm() {
    const now = new Date()
    setType('MESSAGE')
    setMode('REMINDER')
    setDateValue(now.toISOString().split('T')[0])
    setTimeValue(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
    setMessage('')
    setMediaFile(null)
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setMediaFile(file)
    e.target.value = ''
  }

  function removeFile() {
    setMediaFile(null)
  }

  function isValid(): boolean {
    if (!dateValue || !timeValue) return false
    const scheduledAt = new Date(`${dateValue}T${timeValue}`)
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) return false
    if (mode === 'AUTOMATIC' && !message.trim() && !mediaFile) return false
    return true
  }

  async function handleSubmit() {
    if (!isValid()) return

    const scheduledAt = new Date(`${dateValue}T${timeValue}`).toISOString()

    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('type', type)
      formData.append('mode', mode)
      formData.append('scheduledAt', scheduledAt)
      if (message.trim()) formData.append('message', message.trim())
      if (mediaFile) formData.append('file', mediaFile, mediaFile.name)

      await api.post(`conversations/${conversationId}/follow-ups`, { body: formData }).json()

      toast({ title: t('success.created'), variant: 'success' })
      handleClose()
      onCreated()
    } catch {
      toast({ title: t('error.creating'), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function getMinDate(): string {
    return new Date().toISOString().split('T')[0]
  }

  const FileIcon = mediaFile ? getFileIcon(mediaFile) : FileText

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

          {/* Message + attachment (shown always, required for AUTOMATIC if no media) */}
          <div className="space-y-2">
            <Label>
              {t('fields.message')}
              {mode === 'AUTOMATIC' && !mediaFile && (
                <span className="text-destructive ml-1">*</span>
              )}
            </Label>

            {/* File preview */}
            {mediaFile && (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
                <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{mediaFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(mediaFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                  aria-label={t('fields.removeAttachment')}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={mediaFile ? t('fields.attachedFile') : t('fields.message')}
                className="min-h-[80px] resize-none pr-10"
              />
              {/* Attach button inside textarea corner */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={t('fields.attachFile')}
                aria-label={t('fields.attachFile')}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              onChange={handleFileChange}
              className="sr-only"
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
