'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'
import { useAssistantVoices, type CustomVoice } from '@/hooks/use-assistant-voices'
import { VoicePreviewButton } from './voice-preview-button'

interface VoiceManagerSheetProps {
  open: boolean
  onClose: () => void
}

const ACCEPT = 'audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/webm,audio/ogg,audio/mp4,audio/m4a,audio/x-m4a,.mp3,.wav,.m4a,.ogg,.webm'

export function VoiceManagerSheet({ open, onClose }: VoiceManagerSheetProps) {
  const t = useTranslations('assistantVoices')
  const tCommon = useTranslations('common')
  const { voices, isLoading, createVoice, deleteVoice } = useAssistantVoices()

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [creating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<CustomVoice | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resetForm = () => {
    setName('')
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    if (!file) {
      toast({ title: t('error.sampleRequired'), variant: 'destructive' })
      return
    }
    setCreating(true)
    const ok = await createVoice(name.trim(), file)
    setCreating(false)
    if (ok) resetForm()
  }

  const handleConfirmDelete = async () => {
    if (!toDelete) return
    setDeleting(true)
    const ok = await deleteVoice(toDelete.id)
    setDeleting(false)
    if (ok) setToDelete(null)
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="flex flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('title')}</SheetTitle>
            <SheetDescription>{t('subtitle')}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto space-y-6 py-4">
            {/* Formulário de adição */}
            <div className="space-y-4 rounded-lg border p-4">
              <div className="space-y-2">
                <Label htmlFor="voice-name">{t('nameLabel')}</Label>
                <Input
                  id="voice-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('sampleLabel')}</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPT}
                  className="sr-only"
                  id="voice-sample-input"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
                <label
                  htmlFor="voice-sample-input"
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground hover:border-muted-foreground/50"
                >
                  <Upload className="h-4 w-4 shrink-0" />
                  <span className="truncate">{file ? file.name : t('selectFile')}</span>
                </label>
                <p className="text-xs text-muted-foreground">{t('sampleHint')}</p>
              </div>

              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating || !name.trim() || !file}
                className="w-full gap-1.5"
              >
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creating ? t('creating') : t('add')}
              </Button>
            </div>

            {/* Lista de vozes */}
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">
                {t('customGroup')}
              </p>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : voices.length === 0 ? (
                <div className="rounded-lg border border-dashed py-8 text-center">
                  <p className="text-sm text-muted-foreground">{t('empty')}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{t('emptyHint')}</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {voices.map((voice) => (
                    <li
                      key={voice.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      <span className="truncate text-sm font-medium">{voice.name}</span>
                      <div className="flex shrink-0 items-center gap-1">
                        <VoicePreviewButton voiceId={voice.id} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setToDelete(voice)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirm.delete')}</DialogTitle>
            <DialogDescription>{t('confirm.deleteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>
              {tCommon('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? t('deleting') : tCommon('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
