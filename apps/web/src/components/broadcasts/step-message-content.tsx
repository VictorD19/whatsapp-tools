'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Type, ImageIcon, VideoIcon, FileAudio, FileText, Plus, Trash2,
  Upload, X, File, Pencil,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'

// ─── Types ───────────────────────────────────────────────────────────────────

export type VariationMessageType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'

export interface BroadcastVariation {
  messageType: VariationMessageType
  text: string
  file?: File | null
  /** Existing media URL from server (used when editing). */
  existingMediaUrl?: string
  existingFileName?: string
}

interface StepMessageContentProps {
  variations: BroadcastVariation[]
  onVariationsChange: (variations: BroadcastVariation[]) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const messageTypeDefs: Array<{
  type: VariationMessageType
  labelKey: string
  icon: React.ElementType
}> = [
  { type: 'TEXT', labelKey: 'messageType.text', icon: Type },
  { type: 'IMAGE', labelKey: 'messageType.image', icon: ImageIcon },
  { type: 'VIDEO', labelKey: 'messageType.video', icon: VideoIcon },
  { type: 'AUDIO', labelKey: 'messageType.audio', icon: FileAudio },
  { type: 'DOCUMENT', labelKey: 'messageType.document', icon: FileText },
]

const acceptByType: Record<string, string> = {
  IMAGE: '.jpg,.jpeg,.png,.webp,.gif',
  VIDEO: '.mp4,.avi,.mov,.3gp',
  AUDIO: '.mp3,.wav,.ogg,.m4a',
  DOCUMENT: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar',
}

const sizeLimitByType: Record<string, number> = {
  IMAGE: 16 * 1024 * 1024,
  VIDEO: 16 * 1024 * 1024,
  AUDIO: 16 * 1024 * 1024,
  DOCUMENT: 100 * 1024 * 1024,
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatSizeLimit(bytes: number): string {
  return `${bytes / (1024 * 1024)} MB`
}

function typeIcon(type: VariationMessageType) {
  switch (type) {
    case 'TEXT': return <Type className="h-3.5 w-3.5" />
    case 'IMAGE': return <ImageIcon className="h-3.5 w-3.5" />
    case 'VIDEO': return <VideoIcon className="h-3.5 w-3.5" />
    case 'AUDIO': return <FileAudio className="h-3.5 w-3.5" />
    case 'DOCUMENT': return <FileText className="h-3.5 w-3.5" />
  }
}

function useTypeLabel() {
  const t = useTranslations('broadcasts')
  return (type: VariationMessageType) => {
    const def = messageTypeDefs.find((d) => d.type === type)
    return def ? t(def.labelKey) : type
  }
}

// ─── Variation Modal ─────────────────────────────────────────────────────────

function VariationModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean
  initial?: BroadcastVariation
  onSave: (v: BroadcastVariation) => void
  onClose: () => void
}) {
  const t = useTranslations('broadcasts')
  const tc = useTranslations('common')
  const isEditing = !!initial
  const [msgType, setMsgType] = useState<VariationMessageType>(initial?.messageType ?? 'TEXT')
  const [text, setText] = useState(initial?.text ?? '')
  const [file, setFile] = useState<File | null>(initial?.file ?? null)
  const [existingMedia, setExistingMedia] = useState<{ url: string; name: string } | null>(
    initial?.existingMediaUrl ? { url: initial.existingMediaUrl, name: initial.existingFileName || 'arquivo' } : null,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!file || msgType !== 'IMAGE' || !file.type.startsWith('image/')) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file, msgType])

  const isMediaType = msgType !== 'TEXT'

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      e.target.value = ''
      const limit = sizeLimitByType[msgType] ?? 16 * 1024 * 1024
      if (f.size > limit) {
        alert(t('fileSizeExceeded', { limit: formatSizeLimit(limit) }))
        return
      }
      setFile(f)
    },
    [msgType],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const f = e.dataTransfer.files?.[0]
      if (!f) return
      const limit = sizeLimitByType[msgType] ?? 16 * 1024 * 1024
      if (f.size > limit) {
        alert(t('fileSizeExceeded', { limit: formatSizeLimit(limit) }))
        return
      }
      setFile(f)
    },
    [msgType],
  )

  const handleTypeChange = (type: VariationMessageType) => {
    setMsgType(type)
    if (type !== msgType) {
      setFile(null)
      setExistingMedia(null)
    }
  }

  const canSave = isMediaType ? (!!file || !!existingMedia) : text.trim().length > 0

  const handleSave = () => {
    onSave({
      messageType: msgType,
      text,
      file,
      existingMediaUrl: !file && existingMedia ? existingMedia.url : undefined,
      existingFileName: !file && existingMedia ? existingMedia.name : undefined,
    })
    onClose()
  }

  const insertVariable = (variable: string) => {
    setText((prev) => prev + `{{${variable}}}`)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? t('variation.edit') : t('variation.new')}</DialogTitle>
          <DialogDescription>
            {t('variation.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Type selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t('typeLabel')}</Label>
            <div className="flex gap-1.5">
              {messageTypeDefs.map(({ type, labelKey, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleTypeChange(type)}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    msgType === type
                      ? 'bg-primary-500 text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* File upload (media types) */}
          {isMediaType && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('fileLabel')}</Label>

              {file ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    {msgType === 'IMAGE' && previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <File className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : existingMedia ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <File className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{existingMedia.name}</p>
                    <p className="text-xs text-muted-foreground">{t('variation.existingFile')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setExistingMedia(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 text-center transition-colors hover:border-primary-500/50 hover:bg-muted/40"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      {t('fileDragDrop')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('fileMaxSize', { size: formatSizeLimit(sizeLimitByType[msgType] ?? 16 * 1024 * 1024) })}
                      {' — '}
                      {acceptByType[msgType]?.replace(/\./g, '').replace(/,/g, ', ')}
                    </p>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptByType[msgType]}
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>
          )}

          {/* Text / caption */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {isMediaType ? t('captionLabel') : t('messageLabel')}
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => insertVariable('nome')}
                >
                  {'{{nome}}'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => insertVariable('telefone')}
                >
                  {'{{telefone}}'}
                </Button>
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={isMediaType ? t('captionPlaceholder') : t('messagePlaceholder')}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {text.length}/4096
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? tc('save') : tc('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function StepMessageContent({
  variations,
  onVariationsChange,
}: StepMessageContentProps) {
  const t = useTranslations('broadcasts')
  const typeLabel = useTypeLabel()
  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const handleAdd = () => {
    setEditIndex(null)
    setModalOpen(true)
  }

  const handleEdit = (index: number) => {
    setEditIndex(index)
    setModalOpen(true)
  }

  const handleRemove = (index: number) => {
    onVariationsChange(variations.filter((_, i) => i !== index))
  }

  const handleSave = (v: BroadcastVariation) => {
    if (editIndex !== null) {
      const updated = [...variations]
      updated[editIndex] = v
      onVariationsChange(updated)
    } else {
      onVariationsChange([...variations, v])
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm font-medium">{t('variation.label')}</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('variation.hint')}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          {t('variation.add')}
        </Button>
      </div>

      {/* Variations table */}
      {variations.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t('variation.empty')}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-8">
                  #
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-24">
                  {t('typeLabel')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('contentLabel')}
                </th>
                <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32">
                  {t('fileLabel')}
                </th>
                <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide w-20">
                  {t('actionsLabel')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {variations.map((v, index) => (
                <tr key={index} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2 text-muted-foreground">
                    {index + 1}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs font-medium">
                      {typeIcon(v.messageType)}
                      {typeLabel(v.messageType)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <p className="truncate max-w-[250px] text-sm">
                      {v.text || <span className="text-muted-foreground italic">{t('variation.noText')}</span>}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    {v.file ? (
                      <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                        {v.file.name}
                      </span>
                    ) : v.existingFileName ? (
                      <span className="text-xs text-muted-foreground truncate block max-w-[120px]">
                        {v.existingFileName}
                      </span>
                    ) : v.messageType !== 'TEXT' ? (
                      <span className="text-xs text-destructive">{t('variation.noFile')}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleEdit(index)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemove(index)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview */}
      {variations.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">
            {t('variation.preview')}
          </Label>
          <div className="rounded-lg bg-muted/50 p-4">
            <div className="max-w-[280px]">
              <div className="rounded-lg bg-[#dcf8c6] dark:bg-[#005c4b] p-3 text-sm shadow-sm">
                {variations[0].messageType !== 'TEXT' && variations[0].file && (
                  <div className="mb-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground flex items-center gap-1">
                    {typeIcon(variations[0].messageType)}
                    {variations[0].file.name}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">
                  {(variations[0].text || t('variation.noText'))
                    .replace(/\{\{nome\}\}/gi, 'Joao')
                    .replace(/\{\{telefone\}\}/gi, '5511999999999')}
                </p>
              </div>
            </div>
            {variations.length > 1 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {t('variation.moreVariations', { count: variations.length - 1 })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Variation Modal */}
      <VariationModal
        open={modalOpen}
        initial={editIndex !== null ? variations[editIndex] : undefined}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
