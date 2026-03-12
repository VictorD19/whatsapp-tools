'use client'

import React, { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'

interface KnowledgeBase {
  id: string
  name: string
  description?: string | null
  isActive: boolean
}

interface KnowledgeBaseSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; description?: string; isActive?: boolean }) => Promise<void>
  editingKb?: KnowledgeBase | null
}

export function KnowledgeBaseSheet({ open, onClose, onSave, editingKb }: KnowledgeBaseSheetProps) {
  const t = useTranslations('knowledgeBases')
  const tc = useTranslations('common')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editingKb?.name ?? '')
      setDescription(editingKb?.description ?? '')
      setIsActive(editingKb?.isActive ?? true)
    }
  }, [open, editingKb])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        ...(editingKb ? { isActive } : {}),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editingKb ? t('sheet.editTitle') : t('sheet.newTitle')}</SheetTitle>
          <SheetDescription>
            {editingKb ? t('sheet.editDescription') : t('sheet.newDescription')}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="kb-name">{t('fields.name')}</Label>
            <Input
              id="kb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('fields.namePlaceholder')}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kb-description">{t('fields.description')}</Label>
            <Textarea
              id="kb-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('fields.descriptionPlaceholder')}
              rows={3}
            />
          </div>
          {editingKb && (
            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
              <div className="space-y-0.5">
                <Label htmlFor="kb-active" className="cursor-pointer">
                  {t('registration.fieldStatus')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isActive ? t('status.active') : t('status.inactive')}
                </p>
              </div>
              <Switch
                id="kb-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          )}
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? tc('loading') : editingKb ? tc('save') : tc('create')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
