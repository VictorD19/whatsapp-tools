'use client'

import React, { useState, useEffect } from 'react'
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

interface KnowledgeBase {
  id: string
  name: string
  description?: string | null
}

interface KnowledgeBaseSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; description?: string }) => Promise<void>
  editingKb?: KnowledgeBase | null
}

export function KnowledgeBaseSheet({ open, onClose, onSave, editingKb }: KnowledgeBaseSheetProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setName(editingKb?.name ?? '')
      setDescription(editingKb?.description ?? '')
    }
  }, [open, editingKb])

  const handleSubmit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
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
          <SheetTitle>{editingKb ? 'Editar base de conhecimento' : 'Nova base de conhecimento'}</SheetTitle>
          <SheetDescription>
            {editingKb
              ? 'Altere as informacoes da base de conhecimento'
              : 'Preencha os dados para criar uma nova base de conhecimento'}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="kb-name">Nome</Label>
            <Input
              id="kb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Manual do produto"
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="kb-description">Descricao (opcional)</Label>
            <Textarea
              id="kb-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o conteudo desta base de conhecimento"
              rows={3}
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : editingKb ? 'Salvar' : 'Criar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
