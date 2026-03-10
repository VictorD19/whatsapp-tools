'use client'

import React, { useState } from 'react'
import { z } from 'zod'
import { useTranslations } from 'next-intl'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toaster'

interface CreateInstanceModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (name: string) => Promise<unknown>
}

export function CreateInstanceModal({ open, onOpenChange, onCreate }: CreateInstanceModalProps) {
  const t = useTranslations('instances')
  const tc = useTranslations('common')

  const nameSchema = z
    .string()
    .min(2, t('createModal.minChars'))
    .max(50, t('createModal.maxChars'))
    .regex(/^[a-zA-Z0-9_-]+$/, t('createModal.onlyAlphanumeric'))

  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleClose() {
    setName('')
    setError('')
    onOpenChange(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const result = nameSchema.safeParse(name)
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }

    setError('')
    setSubmitting(true)
    try {
      await onCreate(name)
      handleClose()
    } catch {
      toast({ title: t('error.creating'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('createModal.title')}</DialogTitle>
          <DialogDescription>
            {t('createModal.description')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label htmlFor="instance-name">{t('createModal.nameLabel')}</Label>
            <Input
              id="instance-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder={t('createModal.namePlaceholder')}
              autoFocus
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              {tc('cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('createModal.creating') : t('createModal.createButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
