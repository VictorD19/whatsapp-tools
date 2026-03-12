'use client'

import React, { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Upload, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

type ContentType = 'FILES' | 'QA'

interface QAPair {
  question: string
  answer: string
}

interface AddContentModalProps {
  open: boolean
  onClose: () => void
  onSubmitFiles: (name: string, files: File[]) => Promise<void>
  onSubmitQA: (name: string, pairs: QAPair[]) => Promise<void>
}

const MAX_FILES = 5
const MAX_FILE_MB = 5

export function AddContentModal({
  open,
  onClose,
  onSubmitFiles,
  onSubmitQA,
}: AddContentModalProps) {
  const t = useTranslations('knowledgeBases')
  const tc = useTranslations('common')

  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [contentType, setContentType] = useState<ContentType>('FILES')
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [pairs, setPairs] = useState<QAPair[]>([{ question: '', answer: '' }])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setStep(1)
    setName('')
    setContentType('FILES')
    setFiles([])
    setDragging(false)
    setPairs([{ question: '', answer: '' }])
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleContinue = () => {
    if (!name.trim()) return
    setStep(2)
  }

  const handleBack = () => setStep(1)

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    mergeFiles(dropped)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    mergeFiles(selected)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const mergeFiles = (incoming: File[]) => {
    setFiles((prev) => {
      const combined = [...prev, ...incoming]
      return combined.slice(0, MAX_FILES)
    })
  }

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const addPair = () => setPairs((prev) => [...prev, { question: '', answer: '' }])

  const updatePair = (idx: number, field: keyof QAPair, value: string) => {
    setPairs((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (contentType === 'FILES') {
        await onSubmitFiles(name.trim(), files)
      } else {
        const validPairs = pairs.filter((p) => p.question.trim() && p.answer.trim())
        await onSubmitQA(name.trim(), validPairs)
      }
      handleClose()
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    contentType === 'FILES'
      ? files.length > 0
      : pairs.some((p) => p.question.trim() && p.answer.trim())

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden">
        <div className="flex h-[540px]">
          {/* Left panel — stepper */}
          <div className="w-56 shrink-0 bg-muted/30 border-r border-border p-6 flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-semibold leading-snug">{t('modal.title')}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t('modal.description')}
              </p>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-4">
              {/* Step 1 */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    step === 1
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-primary/20 text-primary'
                  }`}
                >
                  {step > 1 ? <Check className="h-4 w-4" /> : '1'}
                </div>
                <span
                  className={`text-sm ${step === 1 ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  {t('modal.stepIdentification')}
                </span>
              </div>

              {/* Connector */}
              <div className="ml-3.5 h-4 w-px bg-border" />

              {/* Step 2 */}
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                    step === 2
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border'
                  }`}
                >
                  2
                </div>
                <span
                  className={`text-sm ${step === 2 ? 'font-medium' : 'text-muted-foreground'}`}
                >
                  {t('modal.stepContent')}
                </span>
              </div>
            </div>
          </div>

          {/* Right panel — form */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Form area */}
            <div className="flex-1 p-6 overflow-y-auto min-h-0">
              {step === 1 && (
                <div className="space-y-5">
                  <h4 className="text-base font-semibold">{t('modal.identification.title')}</h4>
                  <div className="space-y-2">
                    <Input
                      placeholder={t('modal.identification.namePlaceholder')}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {t('modal.identification.typeQuestion')}
                    </p>
                    <RadioGroup
                      value={contentType}
                      onValueChange={(v) => setContentType(v as ContentType)}
                      className="gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="FILES" id="type-files" />
                        <Label htmlFor="type-files" className="cursor-pointer font-normal">
                          {t('modal.identification.typeFiles')}
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="QA" id="type-qa" />
                        <Label htmlFor="type-qa" className="cursor-pointer font-normal">
                          {t('modal.identification.typeQA')}
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {step === 2 && contentType === 'FILES' && (
                <div className="space-y-4">
                  <h4 className="text-base font-semibold">{t('modal.content.title')}</h4>

                  {/* Hidden file input — fora do label para evitar conflito */}
                  <input
                    ref={fileInputRef}
                    id="kb-file-input"
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md"
                    className="sr-only"
                    onChange={handleFileInput}
                  />

                  {/* Dropzone — label nativo aciona o input sem JS */}
                  <label
                    htmlFor="kb-file-input"
                    className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer select-none ${
                      dragging
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-muted-foreground/50'
                    }`}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragging(true)
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragging(true)
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDragging(false)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
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

                  {/* Selected files */}
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

              {step === 2 && contentType === 'QA' && (
                <div className="flex flex-col gap-4 h-full min-h-0">
                  <h4 className="text-base font-semibold shrink-0">{t('modal.content.title')}</h4>

                  {/* Área com scroll — cresce até o limite e ativa scroll */}
                  <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                    {pairs.map((pair, idx) => (
                      <div key={idx} className="space-y-2">
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
                    className="gap-1.5 shrink-0 self-start"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('modal.content.addQuestion')}
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border">
              {step === 1 ? (
                <>
                  <Button variant="outline" onClick={handleClose}>
                    {tc('cancel')}
                  </Button>
                  <Button onClick={handleContinue} disabled={!name.trim()}>
                    {t('modal.continue')}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={handleBack}>
                    {t('modal.back')}
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
                    {submitting ? t('modal.submitting') : t('modal.submit')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
