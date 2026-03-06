'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { ColorPicker } from '@/components/shared/color-picker'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

// ── Types ──

interface TagItem {
  id: string
  name: string
  color: string
  tenantId: string
  createdAt: string
  updatedAt: string
}

interface ApiResponse<T> {
  data: T
}

// ── Component ──

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#6B7280')

  const fetchTags = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<ApiResponse<TagItem[]>>('tags')
      setTags(res.data)
    } catch {
      toast({ title: 'Erro ao carregar tags', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  const openCreateDialog = () => {
    setEditingTag(null)
    setFormName('')
    setFormColor('#6B7280')
    setDialogOpen(true)
  }

  const openEditDialog = (tag: TagItem) => {
    setEditingTag(tag)
    setFormName(tag.name)
    setFormColor(tag.color)
    setDialogOpen(true)
  }

  const openDeleteDialog = (tag: TagItem) => {
    setDeletingTag(tag)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      if (editingTag) {
        const res = await apiPatch<ApiResponse<TagItem>>(
          `tags/${editingTag.id}`,
          { name: formName.trim(), color: formColor },
        )
        setTags((prev) =>
          prev.map((t) => (t.id === editingTag.id ? res.data : t)),
        )
        toast({ title: 'Tag atualizada', variant: 'success' })
      } else {
        const res = await apiPost<ApiResponse<TagItem>>('tags', {
          name: formName.trim(),
          color: formColor,
        })
        setTags((prev) => [...prev, res.data])
        toast({ title: 'Tag criada', variant: 'success' })
      }
      setDialogOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao salvar tag'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTag) return
    setSaving(true)
    try {
      await apiDelete(`tags/${deletingTag.id}`)
      setTags((prev) => prev.filter((t) => t.id !== deletingTag.id))
      toast({ title: 'Tag excluida', variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erro ao excluir tag'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tags</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tags.length} {tags.length === 1 ? 'tag cadastrada' : 'tags cadastradas'}
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nova tag
        </Button>
      </div>

      {/* Tags list */}
      {tags.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma tag cadastrada"
          description="Crie tags para organizar seus contatos"
          action={{ label: 'Criar tag', onClick: openCreateDialog }}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {tags.map((tag) => (
            <div
              key={tag.id}
              data-testid={`tag-item-${tag.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              {/* Color dot */}
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />

              {/* Name */}
              <span className="font-medium text-sm flex-1">{tag.name}</span>

              {/* Edit / Delete */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEditDialog(tag)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => openDeleteDialog(tag)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTag ? 'Editar tag' : 'Nova tag'}
            </DialogTitle>
            <DialogDescription>
              {editingTag
                ? 'Altere as informacoes da tag'
                : 'Preencha os dados para criar uma nova tag'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tag-name">Nome</Label>
              <Input
                id="tag-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: VIP"
                maxLength={50}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Cor</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? 'Salvando...' : editingTag ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir tag</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a tag{' '}
              <strong>{deletingTag?.name}</strong>? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
