'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Phone, Tag, Radio, User, ChevronDown, Pencil,
  X, Plus, StickyNote, Check, Loader2,
} from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { getInitials, formatPhone, cn } from '@/lib/utils'
import { useConversation } from '@/hooks/use-conversation'
import { useTags, useContactTags, type Tag as TagType } from '@/hooks/use-tags'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import { useDeal, type DealNote } from '@/hooks/use-deal'
import { useAuthStore } from '@/stores/auth.store'
import { useInboxStore } from '@/stores/inbox.store'
import type { Conversation, ConversationDeal } from '@/stores/inbox.store'

interface ContactPanelProps {
  conversation: Conversation | null
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function daysSinceLastContact(dateStr: string | null): number {
  if (!dateStr) return 999
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

function formatNoteDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }) + ' ' + d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---- Sub-components ----

function TagsSection({
  contactId,
}: {
  contactId: string
}) {
  const { tags: allTags, isLoading: isLoadingTags, addTagToContact, removeTagFromContact } = useTags()
  const { contactTags, refetchContactTags } = useContactTags(contactId)
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)

  const contactTagIds = useMemo(() => new Set(contactTags.map((t) => t.id)), [contactTags])

  const availableTags = useMemo(() => {
    return allTags.filter((t) => !contactTagIds.has(t.id))
  }, [allTags, contactTagIds])

  async function handleAddTag(tag: TagType) {
    const ok = await addTagToContact(contactId, tag.id)
    if (ok) {
      await refetchContactTags()
      setTagPopoverOpen(false)
    }
  }

  async function handleRemoveTag(tag: TagType) {
    const ok = await removeTagFromContact(contactId, tag.id)
    if (ok) {
      await refetchContactTags()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" />
          <span>Tags</span>
        </div>
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Adicionar tag
            </p>
            {isLoadingTags ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableTags.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">
                Nenhuma tag disponivel
              </p>
            ) : (
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {contactTags.length > 0 ? (
          contactTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs gap-1 pr-1"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                borderColor: `${tag.color}40`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground/60">Nenhuma tag</p>
        )}
      </div>
    </div>
  )
}

function DealStageSection({
  deal,
  onStageChanged,
}: {
  deal: ConversationDeal
  onStageChanged: (stageId: string) => void
}) {
  const { activeStages, closedStages } = usePipelineStages()
  const { moveDeal } = useDeal()
  const [lostReasonOpen, setLostReasonOpen] = useState(false)
  const [lostReason, setLostReason] = useState('')
  const [pendingStageId, setPendingStageId] = useState<string | null>(null)

  async function handleSelectStage(stageId: string, stageType: string) {
    if (stageType === 'LOST') {
      setPendingStageId(stageId)
      setLostReasonOpen(true)
      return
    }
    const ok = await moveDeal(deal.id, stageId)
    if (ok) onStageChanged(stageId)
  }

  async function handleConfirmLost() {
    if (!pendingStageId) return
    const ok = await moveDeal(deal.id, pendingStageId, lostReason || undefined)
    if (ok) {
      onStageChanged(pendingStageId)
      setLostReasonOpen(false)
      setLostReason('')
      setPendingStageId(null)
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">Etapa</span>
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
                  Ativas
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
                  Encerramento
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
          <p className="text-[11px] text-muted-foreground">Motivo da perda (opcional):</p>
          <Input
            value={lostReason}
            onChange={(e) => setLostReason(e.target.value)}
            placeholder="Ex: Escolheu concorrente..."
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
              Cancelar
            </Button>
            <Button
              size="sm"
              className="h-6 text-xs"
              onClick={handleConfirmLost}
            >
              Confirmar
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
  const { updateDealValue } = useDeal()
  const [editing, setEditing] = useState(false)
  const [inputValue, setInputValue] = useState('')

  function startEditing() {
    setInputValue(deal.value != null ? String(deal.value) : '')
    setEditing(true)
  }

  async function handleSave() {
    const numValue = inputValue.trim() === '' ? null : parseFloat(inputValue.replace(',', '.'))
    if (numValue !== null && isNaN(numValue)) return
    const ok = await updateDealValue(deal.id, numValue)
    if (ok) {
      onValueChanged(numValue)
      setEditing(false)
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground shrink-0">Valor</span>
        <div className="flex items-center gap-1 flex-1">
          <span className="text-xs text-muted-foreground">R$</span>
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
      <span className="text-[11px] text-muted-foreground">Valor</span>
      <button
        onClick={startEditing}
        className="flex items-center gap-1 text-xs hover:text-foreground transition-colors"
      >
        <span className="font-medium">
          {deal.value != null ? formatBRL(deal.value) : 'Sem valor'}
        </span>
        <Pencil className="h-3 w-3 text-muted-foreground" />
      </button>
    </div>
  )
}

function LastContactIndicator({ dateStr }: { dateStr: string | null }) {
  const days = daysSinceLastContact(dateStr)

  let colorClass: string
  let label: string

  if (days <= 2) {
    colorClass = 'text-green-600 dark:text-green-400'
    label = days === 0 ? 'Hoje' : days === 1 ? '1 dia' : '2 dias'
  } else if (days <= 5) {
    colorClass = 'text-amber-600 dark:text-amber-400'
    label = `${days} dias`
  } else {
    colorClass = 'text-red-600 dark:text-red-400'
    label = `${days} dias`
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-muted-foreground">Ultimo contato</span>
      <span className={cn('text-xs font-medium', colorClass)}>
        {label}
        {days >= 3 && days <= 5 && ' \u26A0\uFE0F'}
        {days > 5 && ' \uD83D\uDD34'}
      </span>
    </div>
  )
}

function DealNotesSection({ dealId }: { dealId: string }) {
  const { notes, isLoadingNotes, fetchNotes, addNote } = useDeal()
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <StickyNote className="h-3.5 w-3.5" />
        <span>Notas</span>
      </div>

      {/* Notes list */}
      {isLoadingNotes ? (
        <div className="flex justify-center py-3">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : notes.length > 0 ? (
        <div className="space-y-1.5 max-h-[180px] overflow-y-auto">
          {notes.map((note: DealNote) => (
            <div key={note.id} className="rounded-md border p-2 space-y-1 bg-muted/20">
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {note.content}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {note.author.name} &middot; {formatNoteDate(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground/60">Nenhuma nota</p>
      )}

      {/* New note input */}
      <div className="space-y-1.5">
        <Textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Adicionar nota..."
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
            Salvar
          </Button>
        </div>
      </div>
    </div>
  )
}

// ---- Main Component ----

export function ContactPanel({ conversation }: ContactPanelProps) {
  const { assignConversation, closeConversation } = useConversation()
  const userId = useAuthStore((s) => s.user?.id)
  const upsertConversation = useInboxStore((s) => s.upsertConversation)

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
        Selecione uma conversa para ver os detalhes do contato
      </div>
    )
  }

  const contact = conversation.contact
  const contactName = contact.name ?? contact.phone
  const isAssignedToMe = conversation.assignedToId === userId
  const isPending = conversation.status === 'PENDING'
  const activeDeal = conversation.deals?.[0] ?? null

  function handleStageChanged(stageId: string) {
    if (!activeDeal || !conversation) return
    const updatedDeal = { ...activeDeal, stageId }
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
          {contact.avatarUrl && (
            <AvatarImage src={contact.avatarUrl} alt={contactName} />
          )}
          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-lg">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-sm font-semibold">{contactName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <Phone className="h-3 w-3" />
            <span>{formatPhone(contact.phone)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <TagsSection contactId={contact.id} />

      <Separator />

      {/* Deal section */}
      {activeDeal ? (
        <>
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

          <Separator />

          {/* Notes */}
          <DealNotesSection dealId={activeDeal.id} />

          <Separator />
        </>
      ) : (
        <>
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Deal</span>
            <p className="text-[11px] text-muted-foreground/60">Nenhum deal associado</p>
          </div>
          <Separator />
        </>
      )}

      {/* Atendimento */}
      <div className="space-y-3">
        <span className="text-xs font-medium text-muted-foreground">Atendimento</span>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Radio className="h-3 w-3" />
              <span>Instancia</span>
            </div>
            <span className="text-xs text-foreground">{conversation.instance.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Atendente</span>
            </div>
            <span className="text-xs text-foreground">
              {conversation.assignedTo?.name ?? 'Nenhum'}
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
                ? 'Aberta'
                : conversation.status === 'PENDING'
                  ? 'Pendente'
                  : 'Encerrada'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      {(isPending || (conversation.status === 'OPEN' && isAssignedToMe)) && (
        <>
          <Separator />
          <div className="space-y-2">
            {isPending && (
              <Button className="w-full" onClick={() => assignConversation(conversation.id)}>
                Entrar na conversa
              </Button>
            )}
            {conversation.status === 'OPEN' && isAssignedToMe && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => closeConversation(conversation.id)}
              >
                Encerrar
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
