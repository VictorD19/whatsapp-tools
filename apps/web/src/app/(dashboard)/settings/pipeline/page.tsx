'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  GitBranch,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useTranslations } from 'next-intl'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'

// ── Types ──

interface Pipeline {
  id: string
  name: string
  isDefault: boolean
  stages: PipelineStage[]
}

interface PipelineStage {
  id: string
  pipelineId: string
  name: string
  color: string
  type: 'ACTIVE' | 'WON' | 'LOST'
  order: number
  isDefault: boolean
}

interface ApiResponse<T> {
  data: T
}

type StageType = 'ACTIVE' | 'WON' | 'LOST'

// TYPE_LABELS moved inside component to use translations

const TYPE_VARIANTS: Record<StageType, 'info' | 'success' | 'destructive'> = {
  ACTIVE: 'info',
  WON: 'success',
  LOST: 'destructive',
}

// ── Component ──

export default function PipelineSettingsPage() {
  const t = useTranslations('settings.pipeline')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const typeLabels: Record<StageType, string> = {
    ACTIVE: t('stageTypes.ACTIVE'),
    WON: t('stageTypes.WON'),
    LOST: t('stageTypes.LOST'),
  }

  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [deletingStage, setDeletingStage] = useState<PipelineStage | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formColor, setFormColor] = useState('#6B7280')
  const [formType, setFormType] = useState<StageType>('ACTIVE')

  const fetchPipeline = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<ApiResponse<Pipeline[]>>('pipelines')
      const defaultPipeline = res.data.find((p) => p.isDefault) ?? res.data[0]
      if (defaultPipeline) {
        setPipeline(defaultPipeline)
        setStages(defaultPipeline.stages.sort((a, b) => a.order - b.order))
      }
    } catch {
      toast({ title: t('error.creating'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPipeline()
  }, [fetchPipeline])

  const openCreateDialog = () => {
    setEditingStage(null)
    setFormName('')
    setFormColor('#6B7280')
    setFormType('ACTIVE')
    setDialogOpen(true)
  }

  const openEditDialog = (stage: PipelineStage) => {
    setEditingStage(stage)
    setFormName(stage.name)
    setFormColor(stage.color)
    setFormType(stage.type)
    setDialogOpen(true)
  }

  const openDeleteDialog = (stage: PipelineStage) => {
    setDeletingStage(stage)
    setDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!pipeline || !formName.trim()) return
    setSaving(true)
    try {
      if (editingStage) {
        const res = await apiPatch<ApiResponse<PipelineStage>>(
          `pipelines/${pipeline.id}/stages/${editingStage.id}`,
          { name: formName.trim(), color: formColor, type: formType },
        )
        setStages((prev) =>
          prev.map((s) => (s.id === editingStage.id ? res.data : s)),
        )
        toast({ title: t('success.updated'), variant: 'success' })
      } else {
        const res = await apiPost<ApiResponse<PipelineStage>>(
          `pipelines/${pipeline.id}/stages`,
          { name: formName.trim(), color: formColor, type: formType },
        )
        setStages((prev) => [...prev, res.data].sort((a, b) => a.order - b.order))
        toast({ title: t('success.created'), variant: 'success' })
      }
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
    if (!pipeline || !deletingStage) return
    setSaving(true)
    try {
      await apiDelete(`pipelines/${pipeline.id}/stages/${deletingStage.id}`)
      setStages((prev) => prev.filter((s) => s.id !== deletingStage.id))
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

  const handleMoveUp = async (stage: PipelineStage) => {
    if (!pipeline) return
    const idx = stages.findIndex((s) => s.id === stage.id)
    if (idx <= 0) return

    const newStages = [...stages]
    ;[newStages[idx - 1], newStages[idx]] = [newStages[idx], newStages[idx - 1]]

    const reorderPayload = newStages.map((s, i) => ({ id: s.id, order: i + 1 }))

    // Optimistic update
    setStages(newStages.map((s, i) => ({ ...s, order: i + 1 })))

    try {
      const res = await apiPatch<ApiResponse<PipelineStage[]>>(
        `pipelines/${pipeline.id}/stages/reorder`,
        { stages: reorderPayload },
      )
      setStages(res.data.sort((a, b) => a.order - b.order))
    } catch {
      toast({ title: t('error.updating'), variant: 'destructive' })
      fetchPipeline()
    }
  }

  const handleMoveDown = async (stage: PipelineStage) => {
    if (!pipeline) return
    const idx = stages.findIndex((s) => s.id === stage.id)
    if (idx >= stages.length - 1) return

    const newStages = [...stages]
    ;[newStages[idx], newStages[idx + 1]] = [newStages[idx + 1], newStages[idx]]

    const reorderPayload = newStages.map((s, i) => ({ id: s.id, order: i + 1 }))

    // Optimistic update
    setStages(newStages.map((s, i) => ({ ...s, order: i + 1 })))

    try {
      const res = await apiPatch<ApiResponse<PipelineStage[]>>(
        `pipelines/${pipeline.id}/stages/reorder`,
        { stages: reorderPayload },
      )
      setStages(res.data.sort((a, b) => a.order - b.order))
    } catch {
      toast({ title: t('error.updating'), variant: 'destructive' })
      fetchPipeline()
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.pipeline') }]}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.pipeline') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t('newStage')}
        </Button>
      </div>

      {/* Pipeline name */}
      {pipeline && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GitBranch className="h-4 w-4" />
          <span>{pipeline.name}</span>
          {pipeline.isDefault && (
            <Badge variant="secondary" className="text-[10px]">{t('default')}</Badge>
          )}
        </div>
      )}

      {/* Stages list */}
      {stages.length === 0 ? (
        <EmptyState
          icon={GitBranch}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), onClick: openCreateDialog }}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              data-testid={`stage-row-${stage.id}`}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              {/* Grip icon */}
              <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />

              {/* Color dot */}
              <span
                className="h-3 w-3 rounded-full shrink-0"
                style={{ backgroundColor: stage.color }}
              />

              {/* Name */}
              <span className="font-medium text-sm flex-1">{stage.name}</span>

              {/* Type badge */}
              <Badge variant={TYPE_VARIANTS[stage.type]} className="text-[10px]">
                {typeLabels[stage.type]}
              </Badge>

              {/* Default badge */}
              {stage.isDefault && (
                <Badge variant="secondary" className="text-[10px]">{t('default')}</Badge>
              )}

              {/* Move buttons */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(stage)}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={idx === stages.length - 1}
                  onClick={() => handleMoveDown(stage)}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Edit / Delete */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEditDialog(stage)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  disabled={stage.isDefault}
                  onClick={() => openDeleteDialog(stage)}
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
              {editingStage ? t('edit.title') : t('create.title')}
            </DialogTitle>
            <DialogDescription>
              {editingStage ? t('edit.description') : t('create.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="stage-name">{t('create.nameLabel')}</Label>
              <Input
                id="stage-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Qualificado"
                maxLength={100}
              />
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>{t('create.colorLabel')}</Label>
              <ColorPicker value={formColor} onChange={setFormColor} />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>{t('create.typeLabel')}</Label>
              <div className="flex gap-2">
                {(['ACTIVE', 'WON', 'LOST'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formType === t
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? t('create.creating') : editingStage ? tc('save') : tc('create')}
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
              {t.rich('delete.description', { name: deletingStage?.name, strong: (chunks) => <strong>{chunks}</strong> })}
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
