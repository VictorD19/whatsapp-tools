'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Phone, User, Calendar, Check, ChevronDown, Pencil, X, Loader2, StickyNote, Trash2,
} from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { useDeal, type Deal, type DealNote } from '@/hooks/use-deal'
import type { PipelineStage } from '@/hooks/use-pipeline-stages'
import { getInitials, formatPhone, cn } from '@/lib/utils'
import { formatCurrency, getCurrencySymbol, formatDate, formatDateTime } from '@/lib/formatting'

interface DealDetailSheetProps {
  open: boolean
  onClose: () => void
  deal: Deal
  stages: PipelineStage[]
  onUpdated: () => void
  onDeleted: () => void
}

function formatNoteDate(dateStr: string): string {
  return formatDateTime(dateStr)
}

export function DealDetailSheet({ open, onClose, deal, stages, onUpdated, onDeleted }: DealDetailSheetProps) {
  const t = useTranslations('crm')
  const tc = useTranslations('common')
  const { updateDeal, deleteDeal, moveDeal, notes, isLoadingNotes, fetchNotes, addNote } = useDeal()

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const [editingValue, setEditingValue] = useState(false)
  const [valueInput, setValueInput] = useState('')
  const [newNote, setNewNote] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)

  useEffect(() => {
    if (open && deal) {
      fetchNotes(deal.id)
    }
  }, [open, deal, fetchNotes])

  const contactName = deal.contact.name ?? deal.contact.phone
  const activeStages = stages.filter((s) => s.type === 'ACTIVE')
  const closedStages = stages.filter((s) => s.type === 'WON' || s.type === 'LOST')
  const isClosed = deal.stage.type === 'WON' || deal.stage.type === 'LOST'

  async function handleSaveTitle() {
    const t = titleInput.trim() || undefined
    await updateDeal(deal.id, { title: t ?? '' })
    setEditingTitle(false)
    onUpdated()
  }

  async function handleSaveValue() {
    const num = valueInput.trim() === '' ? undefined : parseFloat(valueInput.replace(',', '.'))
    if (num !== undefined && isNaN(num)) return
    await updateDeal(deal.id, { value: num ?? 0 })
    setEditingValue(false)
    onUpdated()
  }

  async function handleSelectStage(stageId: string, stageType: string) {
    if (stageType === 'LOST') {
      setPendingStageId(stageId)
      setLostReasonOpen(true)
      return
    }
    await moveDeal(deal.id, stageId)
    onUpdated()
  }

  async function handleConfirmLost() {
    if (!pendingStageId) return
    await moveDeal(deal.id, pendingStageId, lostReason || undefined)
    setLostReasonOpen(false)
    setLostReason('')
    setPendingStageId(null)
    onUpdated()
  }

  async function handleAddNote() {
    if (!newNote.trim()) return
    setIsSavingNote(true)
    const ok = await addNote(deal.id, newNote.trim())
    if (ok) setNewNote('')
    setIsSavingNote(false)
  }

  async function handleDelete() {
    setDeleting(true)
    const ok = await deleteDeal(deal.id)
    setDeleting(false)
    if (ok) {
      setDeleteDialogOpen(false)
      onDeleted()
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              {/* Editable title */}
              {editingTitle ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    className="h-7 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveTitle()
                      if (e.key === 'Escape') setEditingTitle(false)
                    }}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSaveTitle}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTitle(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setTitleInput(deal.title ?? ''); setEditingTitle(true) }}
                  className="flex items-center gap-1 text-left hover:text-muted-foreground transition-colors"
                >
                  <span className="truncate">{deal.title || contactName}</span>
                  <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
                </button>
              )}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Stage selector */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('stage')}</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors"
                    disabled={isClosed}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: deal.stage.color }} />
                    <span className="max-w-[140px] truncate">{deal.stage.name}</span>
                    {!isClosed && <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {activeStages.length > 0 && (
                    <>
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground">{t('activeStages')}</DropdownMenuLabel>
                      {activeStages.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => handleSelectStage(s.id, s.type)} className="text-xs gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                          {s.id === deal.stageId && <Check className="h-3 w-3 ml-auto text-primary-500" />}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {closedStages.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-[10px] text-muted-foreground">{t('closedStages')}</DropdownMenuLabel>
                      {closedStages.map((s) => (
                        <DropdownMenuItem key={s.id} onClick={() => handleSelectStage(s.id, s.type)} className="text-xs gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.name}
                          {s.id === deal.stageId && <Check className="h-3 w-3 ml-auto text-primary-500" />}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Lost reason inline */}
            {lostReasonOpen && (
              <div className="rounded-md border p-2 space-y-2 bg-muted/30">
                <p className="text-[11px] text-muted-foreground">{t('lostReasonLabel')}</p>
                <Input
                  value={lostReason}
                  onChange={(e) => setLostReason(e.target.value)}
                  placeholder={t('lostReasonPlaceholder')}
                  className="h-7 text-xs"
                />
                <div className="flex gap-1.5 justify-end">
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                    setLostReasonOpen(false)
                    setPendingStageId(null)
                    setLostReason('')
                  }}>{tc('cancel')}</Button>
                  <Button size="sm" className="h-6 text-xs" onClick={handleConfirmLost}>{tc('confirm')}</Button>
                </div>
              </div>
            )}

            {/* Value */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('dealValue')}</span>
              {editingValue ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{getCurrencySymbol()}</span>
                  <Input
                    value={valueInput}
                    onChange={(e) => setValueInput(e.target.value)}
                    className="h-6 text-xs w-24"
                    placeholder="0,00"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveValue()
                      if (e.key === 'Escape') setEditingValue(false)
                    }}
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSaveValue}>
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditingValue(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => { setValueInput(deal.value != null ? String(deal.value) : ''); setEditingValue(true) }}
                  className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
                >
                  <span className="font-medium">
                    {deal.value != null ? formatCurrency(Number(deal.value)) : t('noValue')}
                  </span>
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Assigned to */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('attendant')}</span>
              <span className="text-xs">{deal.assignedTo?.name ?? t('noneAssigned')}</span>
            </div>

            {/* Pipeline */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{t('pipeline')}</span>
              <span className="text-xs">{deal.pipeline.name}</span>
            </div>

            <Separator />

            {/* Contact info */}
            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground">{t('contact')}</span>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary-500/10 text-primary-500 text-sm">
                    {getInitials(contactName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{contactName}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span>{formatPhone(deal.contact.phone)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Timestamps */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{t('createdAt')}</span>
                <span>{formatDate(deal.createdAt)}</span>
              </div>
              {deal.wonAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('wonAt')}</span>
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">
                    {formatDate(deal.wonAt)}
                  </Badge>
                </div>
              )}
              {deal.lostAt && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('lostAt')}</span>
                  <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]">
                    {formatDate(deal.lostAt)}
                  </Badge>
                </div>
              )}
              {deal.lostReason && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t('lostReason')}</span>
                  <span className="text-right max-w-[180px] truncate">{deal.lostReason}</span>
                </div>
              )}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <StickyNote className="h-3.5 w-3.5" />
                <span>{t('notes')}</span>
              </div>

              {isLoadingNotes ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : notes.length > 0 ? (
                <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                  {notes.map((note: DealNote) => (
                    <div key={note.id} className="rounded-md border p-2 space-y-1 bg-muted/20">
                      <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{note.content}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {note.author.name} &middot; {formatNoteDate(note.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/60">{t('noNotes')}</p>
              )}

              <div className="space-y-1.5">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={t('addNotePlaceholder')}
                  className="min-h-[60px] text-xs resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote()
                  }}
                />
                <div className="flex justify-end">
                  <Button size="sm" className="h-6 text-xs" onClick={handleAddNote} disabled={!newNote.trim() || isSavingNote}>
                    {isSavingNote ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    {t('saveNote')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t('deleteDeal')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => !v && setDeleteDialogOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmDeletion')}</DialogTitle>
            <DialogDescription>
              {t('deleteDealDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>{tc('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('deleting') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
