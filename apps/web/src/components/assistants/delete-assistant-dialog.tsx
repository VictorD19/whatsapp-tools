'use client'

import React from 'react'
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

interface DeleteAssistantDialogProps {
  open: boolean
  name: string
  loading: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteAssistantDialog({ open, name, loading, onClose, onConfirm }: DeleteAssistantDialogProps) {
  const t = useTranslations('assistants')
  const tc = useTranslations('common')
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('delete.title')}</DialogTitle>
          <DialogDescription>
            {t.rich('delete.description', { name, strong: (chunks) => <strong>{chunks}</strong> })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {tc('cancel')}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? t('delete.deleting') : tc('delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
