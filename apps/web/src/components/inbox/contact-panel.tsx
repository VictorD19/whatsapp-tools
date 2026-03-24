'use client'

import React, { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Phone, Radio, User, ChevronDown, Pencil,
  X, StickyNote, Check, Loader2, Trash2,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { getInitials, formatPhone, cn } from '@/lib/utils'
import { apiPatch } from '@/lib/api'
import { toast } from '@/components/ui/toaster'
import { useConversation } from '@/hooks/use-conversation'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useDeal, type DealNote } from '@/hooks/use-deal'
import { useAuthStore } from '@/stores/auth.store'
import { useInboxStore } from '@/stores/inbox.store'
import type { Conversation, ConversationDeal } from '@/stores/inbox.store'
import { TagsSection } from '@/components/shared/tags-section'
import { FollowUpSection } from './follow-up-section'
import { formatCurrency, getCurrencySymbol, formatDateShort, formatTime } from '@/lib/formatting'

interface ContactPanelProps {
  conversation: Conversation | null
}

function daysSinceLastContact(dateStr: string | null): number {
  if (!dateStr) return 999
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function formatNoteDate(dateStr: string): string {
  return formatDateShort(dateStr) + ' ' + formatTime(dateStr)
}

// ---- Sub-components ----

function DealStageSection({
  deal,
  onStageChanged,
}: {
  deal: ConversationDeal
  onStageChanged: (stageId: string, stage: { id: string; name: string; color: string; type: 'ACTIVE' | 'WON' | 'LOST' }) => void
}) {
  const t = useTranslations('inbox.contactPanel')
  const tc = useTranslations('common')
  const { activeStages, closedStages } = usePipelineStages()
  const { moveDeal } = useDeal()
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)

  const allStages = [...activeStages, ...closedStages]

  async function handleSelectStage(stageId: string, stageType: string) {
    if (stageType === 'LOST') {
      setPendingStageId(stageId)
      setLostReasonOpen(true)
      return
    }
    const ok = await moveDeal(deal.id, stageId)
    if (ok) {
      const stage = allStages.find((s) => s.id === stageId)
      if (stage) onStageChanged(stageId, stage)
    }
  }

  async function handleConfirmLost() {
    if (!pendingStageId) return
    const ok = await moveDeal(deal.id, pendingStageId, lostReason || undefined)
    if (ok) {
      const stage = allStages.find((s) => s.id === pendingStageId)
      if (stage) onStageChanged(pendingStageId, stage)
      setLostReasonOpen(false)
      setLostReason('')
      setPendingStageId(null)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{t('stage')}</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs hover:bg-muted transition-colors">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: deal.stage.color }}
              />
              <span className="max-w-[120px] truncate">{deal.stage.name}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {activeStages.length > 0 && (
              <>
                <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                  {t('activeStages')}
                </DropdownMenuLabel>
                {activeStages.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => handleSelectStage(stage.id, stage.type)}
                    className="text-xs gap-2"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                    {stage.id === deal.stageId && (
                      <Check className="h-3 w-3 ml-auto text-primary-500" />
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {closedStages.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] text-muted-foreground">
                  {t('closedStages')}
                </DropdownMenuLabel>
                {closedStages.map((stage) => (
                  <DropdownMenuItem
                    key={stage.id}
                    onClick={() => handleSelectStage(stage.id, stage.type)}
                    className="text-xs gap-2"
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color }}
                    />
                    {stage.name}
                    {stage.id === deal.stageId && (
                      <Check className="h-3 w-3 ml-auto text-primary-500" />
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Lost reason dialog (inline) */}
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
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => {
                setLostReasonOpen(false)
                setPendingStageId(null)
                setLostReason('')
              }}
            >
              {tc('cancel')}
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs"
              onClick={handleConfirmLost}
            >
              {tc('confirm')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DealValueSection({
  deal,
  onValueChanged,
}: {
  deal: ConversationDeal
  onValueChanged: (value: number | null) => void
}) {
  const t = useTranslations('inbox.contactPanel')
  const { updateDeal } = useDeal()
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  function startEditing() {
    setInputValue(deal.value != null ? String(deal.value) : '')
    setEditing(true)
  }

  async function handleSave() {
    const numValue = inputValue.trim() === '' ? null : parseFloat(inputValue.replace(',', '.'))
    if (numValue !== null && isNaN(numValue)) return
    const result = await updateDeal(deal.id, { value: numValue ?? 0 })
    if (result) {
      onValueChanged(numValue)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground shrink-0">{t('value')}</span>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-muted-foreground">{getCurrencySymbol()}</span>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="0,00"
            className="h-6 text-xs flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') setEditing(false)
            }}
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleSave}>
            <Check className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setEditing(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{t('value')}</span>
      <button
        onClick={startEditing}
        className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
      >
        <span className="font-medium">
          {deal.value != null ? formatCurrency(deal.value) : t('noValue')}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

function LastContactIndicator({ dateStr }: { dateStr: string | null }) {
  const t = useTranslations('inbox.contactPanel')
  const days = daysSinceLastContact(dateStr)

  let colorClass: string
  let label: string

  if (days <= 2) {
    colorClass = 'text-green-600 dark:text-green-400'
    label = days === 0 ? t('todayLabel') : days === 1 ? t('oneDayLabel') : t('twoDaysLabel')
  } else if (days <= 5) {
    colorClass = 'text-amber-600 dark:text-amber-400'
    label = t('daysLabel', { count: days })
  } else {
    colorClass = 'text-red-600 dark:text-red-400'
    label = t('daysLabel', { count: days })
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">{t('lastContact')}</span>
      <span className={cn('text-xs font-medium', colorClass)}>
        {label}
        {days >= 3 && days <= 5 && ' \u26A0\uFE0F'}
        {days > 5 && ' \uD83D\uDD34'}
      </span>
    </div>
  )
}

function DealNotesSection({ dealId }: { dealId: string }) {
  const t = useTranslations('inbox.contactPanel')
  const tc = useTranslations('common')
  const { notes, isLoadingNotes, fetchNotes, addNote, deleteNote } = useDeal()
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null)
  const [confirmNoteId, setConfirmNoteId] = useState<string | null>(null)

  useEffect(() => {
    fetchNotes(dealId)
  }, [dealId, fetchNotes])

  async function handleAddNote() {
    if (!newNote.trim()) return
    setIsSaving(true)
    const ok = await addNote(dealId, newNote.trim())
    if (ok) setNewNote('')
    setIsSaving(false)
  }

  async function handleDeleteNote(noteId: string) {
    setDeletingNoteId(noteId)
    await deleteNote(dealId, noteId)
    setDeletingNoteId(null)
    setConfirmNoteId(null)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5" />
        <span>{t('notes')}</span>
      </div>

      {/* Notes list */}
      {isLoadingNotes ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {notes.map((note: DealNote) => (
            <div key={note.id} className="group/note rounded-md border p-2 space-y-1 bg-muted/20">
              <div className="flex items-start justify-between gap-1">
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap flex-1">
                  {note.content}
                </p>
                <button
                  onClick={() => setConfirmNoteId(note.id)}
                  className="shrink-0 text-muted-foreground opacity-0 group-hover/note:opacity-100 hover:text-destructive transition-all mt-0.5"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {note.author.name} &middot; {formatNoteDate(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/60">{t('noNotes')}</p>
      )}

      {/* New note input */}
      <div className="space-y-1.5">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder={t('addNotePlaceholder')}
          className="min-h-[60px] text-xs resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleAddNote()
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            className="h-6 text-xs"
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : null}
            {tc('save')}
          </Button>
        </div>
      </div>

      {/* Delete note confirmation dialog */}
      <Dialog open={confirmNoteId !== null} onOpenChange={(v) => !v && setConfirmNoteId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('confirmDeleteNote')}</DialogTitle>
            <DialogDescription>{t('confirmDeleteNoteDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmNoteId(null)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmNoteId && handleDeleteNote(confirmNoteId)}
              disabled={deletingNoteId !== null}
            >
              {deletingNoteId ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : null}
              {deletingNoteId ? t('deletingNote') : tc('delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---- Main Component ----

export function ContactPanel({ conversation }: ContactPanelProps) {
  const t = useTranslations('inbox.contactPanel')
  const { assignConversation, closeConversation } = useConversation()
  const userId = useAuthStore((s) => s.user?.id)
  const upsertConversation = useInboxStore((s) => s.upsertConversation)
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
        {t('selectConversationDetails')}
      </div>
    )
  }

  const contact = conversation.contact
  const contactName = contact.name ?? (contact.phone.includes('@g.us') ? t('group') : contact.phone)
  const isAssignedToMe = conversation.assignedToId === userId
  const isPending = conversation.status === 'PENDING'
  const activeDeal = conversation.deals?.[0] ?? null

  function startEditingName() {
    setNameValue(contact.name ?? '')
    setEditingName(true)
  }

  async function handleSaveName() {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === contact.name) {
      setEditingName(false)
      return
    }
    setSavingName(true)
    try {
      await apiPatch(`contacts/${contact.id}`, { name: trimmed })
      upsertConversation({
        ...conversation!,
        contact: { ...contact, name: trimmed },
      })
      toast({ title: t('nameUpdated'), variant: 'success' })
      setEditingName(false)
    } catch {
      toast({ title: t('errorUpdatingName'), variant: 'destructive' })
    } finally {
      setSavingName(false)
    }
  }

  function handleStageChanged(
    stageId: string,
    stage: { id: string; name: string; color: string; type: 'ACTIVE' | 'WON' | 'LOST' },
  ) {
    if (!activeDeal || !conversation) return
    const updatedDeal = {
      ...activeDeal,
      stageId,
      stage: { ...activeDeal.stage, ...stage },
    }
    upsertConversation({
      ...conversation,
      deals: [updatedDeal, ...(conversation.deals?.slice(1) ?? [])],
    })
  }

  function handleValueChanged(value: number | null) {
    if (!activeDeal || !conversation) return
    const updatedDeal = { ...activeDeal, value }
    upsertConversation({
      ...conversation,
      deals: [updatedDeal, ...(conversation.deals?.slice(1) ?? [])],
    })
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      {/* Contact info */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Avatar className="h-14 w-14">
          {contact.avatarUrl && contact.avatarUrl !== 'unavailable' && (
            <AvatarImage src={contact.avatarUrl} alt={contactName} />
          )}
          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-lg">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center w-full">
          {editingName ? (
            <div className="flex items-center justify-center gap-1">
              <input
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                className="text-sm font-semibold text-center bg-transparent border-none outline-none w-full"
                autoFocus
                disabled={savingName}
              />
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                {savingName ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1 group">
              <h3 className="text-sm font-semibold">{contactName}</h3>
              <button
                onClick={startEditingName}
                className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground transition-all"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
          {!contact.phone.endsWith('@g.us') && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 justify-center">
              <Phone className="h-3 w-3" />
              <span>{formatPhone(contact.phone)}</span>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Atendimento */}
      <div className="space-y-3">
        <span className="text-xs font-medium text-muted-foreground">{t('service')}</span>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Radio className="h-3 w-3" />
              <span>{t('instanceLabel')}</span>
            </div>
            <span className="text-xs text-foreground">{conversation.instance.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{t('attendant')}</span>
            </div>
            <span className="text-xs text-foreground">
              {conversation.assignedTo?.name ?? t('none')}
            </span>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Status</span>
            <Badge
              variant="secondary"
              className={cn(
                'text-[10px]',
                conversation.status === 'OPEN'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : conversation.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              {conversation.status === 'OPEN'
                ? t('statusOpen')
                : conversation.status === 'PENDING'
                  ? t('statusPending')
                  : t('statusClosed')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions — apenas entrar na conversa fica aqui */}
      {isPending && (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => assignConversation(conversation.id)}>
            {t('joinConversation')}
          </Button>
        </div>
      )}

      <Separator />

      {/* Deal section */}
      {activeDeal ? (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span className="font-semibold text-foreground text-xs">Deal</span>
            <span className="text-[10px] text-muted-foreground">
              ({activeDeal.pipeline.name})
            </span>
          </div>

          <DealStageSection deal={activeDeal} onStageChanged={handleStageChanged} />
          <DealValueSection deal={activeDeal} onValueChanged={handleValueChanged} />
          <LastContactIndicator dateStr={conversation.lastMessageAt} />
        </div>
      ) : (
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Deal</span>
          <p className="text-[11px] text-muted-foreground/60">{t('noDealAssociated')}</p>
        </div>
      )}

      {/* Tags */}
      <TagsSection contactId={contact.id} />

      <Separator />

      {/* Follow-ups */}
      <FollowUpSection conversationId={conversation.id} />

      {activeDeal && (
        <>
          <Separator />

          {/* Notes */}
          <DealNotesSection dealId={activeDeal.id} />
        </>
      )}

      {/* Encerrar conversa — sempre no final */}
      {conversation.status === 'OPEN' && isAssignedToMe && (
        <>
          <Separator />
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => closeConversation(conversation.id)}
          >
            {t('endConversation')}
          </Button>
        </>
      )}
    </div>
  )
}
