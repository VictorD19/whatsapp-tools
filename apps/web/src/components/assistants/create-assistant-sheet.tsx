'use client'

import React, { useState, useCallback, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'

interface CreateAssistantSheetProps {
  open: boolean
  saving: boolean
  onClose: () => void
  onSave: (data: { name: string; description: string }) => void
}

export function CreateAssistantSheet({ open, saving, onClose, onSave }: CreateAssistantSheetProps) {
  const t = useTranslations('assistants')
  const tc = useTranslations('common')

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
    }
  }, [open])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return
    onSave({ name: name.trim(), description: description.trim() })
  }, [name, description, onSave])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('sheet.newTitle')}</SheetTitle>
          <SheetDescription>{t('sheet.newDescription')}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="create-assistant-name">{t('fields.name')}</Label>
            <Input
              id="create-assistant-name"
              placeholder={t('fields.namePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-assistant-desc">{t('fields.description')}</Label>
            <Textarea
              id="create-assistant-desc"
              placeholder={t('fields.descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? t('form.saving') : tc('create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
