'use client'

import React, { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type ContentType = 'FILES' | 'QA'

interface QAPair {
  question: string
  answer: string
}

interface AddContentSheetProps {
  open: boolean
  onClose: () => void
  onSubmitFiles: (files: File[]) => Promise<void>
  onSubmitQA: (name: string, pairs: QAPair[]) => Promise<void>
}

const MAX_FILES = 5
const MAX_FILE_MB = 5

export function AddContentSheet({
  open,
  onClose,
  onSubmitFiles,
  onSubmitQA,
}: AddContentSheetProps) {
  const t = useTranslations('knowledgeBases')
  const tc = useTranslations('common')

  const [contentType, setContentType] = useState<ContentType>('FILES')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [name, setName] = useState('')
  const [pairs, setPairs] = useState<QAPair[]>([{ question: '', answer: '' }])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setContentType('FILES')
    setFiles([])
    setDragging(false)
    setName('')
    setPairs([{ question: '', answer: '' }])
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const mergeFiles = (incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming].slice(0, MAX_FILES))
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const addPair = () => setPairs((prev) => [...prev, { question: '', answer: '' }])

  const removePair = (idx: number) => {
    if (pairs.length === 1) return
    setPairs((prev) => prev.filter((_, i) => i !== idx))
  }

  const updatePair = (idx: number, field: keyof QAPair, value: string) => {
    setPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  const canSubmit =
    contentType === 'FILES'
      ? files.length > 0
      : name.trim() !== '' && pairs.some((p) => p.question.trim() && p.answer.trim())

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (contentType === 'FILES') {
        await onSubmitFiles(files)
      } else {
        const validPairs = pairs.filter((p) => p.question.trim() && p.answer.trim())
        await onSubmitQA(name.trim(), validPairs)
      }
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>{t('sheet.addContentTitle')}</SheetTitle>
          <SheetDescription>{t('sheet.addContentDescription')}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
          {/* Seletor de tipo */}
          <div className="space-y-3">
            <p className="text-sm font-medium">{t('modal.identification.typeQuestion')}</p>
            <RadioGroup
              value={contentType}
              onValueChange={(v) => {
                setContentType(v as ContentType)
                setFiles([])
                setName('')
                setPairs([{ question: '', answer: '' }])
              }}
              className="gap-2"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="FILES" id="sheet-type-files" />
                <Label htmlFor="sheet-type-files" className="cursor-pointer font-normal">
                  {t('modal.identification.typeFiles')}
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="QA" id="sheet-type-qa" />
                <Label htmlFor="sheet-type-qa" className="cursor-pointer font-normal">
                  {t('modal.identification.typeQA')}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Formulário: Arquivos */}
          {contentType === 'FILES' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                id="kb-file-input-sheet"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.md"
                className="sr-only"
                onChange={(e) => {
                  mergeFiles(Array.from(e.target.files ?? []))
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
              />

              <label
                htmlFor="kb-file-input-sheet"
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer select-none ${
                  dragging
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/50'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragging(false)
                  mergeFiles(Array.from(e.dataTransfer.files))
                }}
              >
                <Upload className="h-8 w-8 mb-3 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{t('modal.content.dropzone')}</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {t('modal.content.dropzoneHint', { max: MAX_FILES, size: MAX_FILE_MB })}
                </p>
              </label>

              {files.length > 0 && (
                <div className="space-y-1.5">
                  {files.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/40 text-sm"
                    >
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {(f.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Formulário: Q&A */}
          {contentType === 'QA' && (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="qa-name">{t('fields.name')}</Label>
                <Input
                  id="qa-name"
                  placeholder={t('fields.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                {pairs.map((pair, idx) => (
                  <div
                    key={idx}
                    className="space-y-2 p-3 rounded-md bg-muted/20 border border-border relative"
                  >
                    {pairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePair(idx)}
                        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <Label className="text-xs text-muted-foreground">
                      {t('modal.content.questionLabel', { n: idx + 1 })}
                    </Label>
                    <Input
                      placeholder={t('modal.content.questionPlaceholder')}
                      value={pair.question}
                      onChange={(e) => updatePair(idx, 'question', e.target.value)}
                    />
                    <Textarea
                      placeholder={t('modal.content.answerPlaceholder')}
                      value={pair.answer}
                      onChange={(e) => updatePair(idx, 'answer', e.target.value)}
                      rows={3}
                    />
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={addPair}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('modal.content.addQuestion')}
              </Button>
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={handleClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
            {submitting ? t('modal.submitting') : t('modal.submit')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
