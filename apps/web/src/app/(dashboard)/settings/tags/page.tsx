'use client'

import React, { useState } from 'react'
import { Plus, Pencil, Trash2, Tag } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { TAGS_QUERY_KEY } from '@/hooks/use-tags'

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
  const t = useTranslations('settings.tags')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const queryClient = useQueryClient()
  const { data: tags = [], isLoading: loading } = useQuery({
    queryKey: TAGS_QUERY_KEY,
    queryFn: () => apiGet<ApiResponse<TagItem[]>>('tags').then((r) => r.data),
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#6B7280')

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
        await apiPatch<ApiResponse<TagItem>>(
          `tags/${editingTag.id}`,
          { name: formName.trim(), color: formColor },
        )
        toast({ title: t('success.updated'), variant: 'success' })
      } else {
        await apiPost<ApiResponse<TagItem>>('tags', {
          name: formName.trim(),
          color: formColor,
        })
        toast({ title: t('success.created'), variant: 'success' })
      }
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
      setDialogOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('error.creating')
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
      queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
      toast({ title: t('success.deleted'), variant: 'success' })
      setDeleteDialogOpen(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('error.deleting')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.tags') }]}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.tags') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tags.length === 1 ? t('count', { count: tags.length }) : t('countPlural', { count: tags.length })}
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t('newTag')}
        </Button>
      </div>

      {/* Tags list */}
      {tags.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), onClick: openCreateDialog }}
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
              {editingTag ? t('edit.title') : t('create.title')}
            </DialogTitle>
            <DialogDescription>
              {editingTag ? t('edit.description') : t('create.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="tag-name">{t('create.nameLabel')}</Label>
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
              <Label>{t('create.colorLabel')}</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? tc('loading') : editingTag ? tc('save') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('delete.description', { name: deletingTag?.name, strong: (chunks) => <strong>{chunks}</strong> })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? tc('loading') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
