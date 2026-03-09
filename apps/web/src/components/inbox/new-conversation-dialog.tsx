'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Search, UserPlus, Loader2, Phone, X, ChevronsUpDown, Check } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost } from '@/lib/api'
import { useInstancesStore } from '@/stores/instances.store'
import { useInstances } from '@/hooks/use-instances'
import { useInboxStore, type Conversation } from '@/stores/inbox.store'
import { cn } from '@/lib/utils'

interface Contact {
  id: string
  phone: string
  name: string | null
  avatarUrl: string | null
}

interface PaginatedContacts {
  data: Contact[]
  meta: { total: number }
}

interface NewConversationDialogProps {
  open: boolean
  onClose: () => void
  onConversationCreated: (conversationId: string) => void
}

// ---------------------------------------------------------------------------
// ContactCombobox — select-like trigger + popover dropdown via portal
// ---------------------------------------------------------------------------
interface ContactComboboxProps {
  selectedContact: Contact | null
  onSelect: (c: Contact) => void
  onClear: () => void
  onAddNew: (value: string) => void
  disabled?: boolean
}

function ContactCombobox({
  selectedContact,
  onSelect,
  onClear,
  onAddNew,
  disabled,
}: ContactComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setContacts([]); return }
    setSearching(true)
    try {
      const params = new URLSearchParams({ search: q, limit: '30' })
      const res = await apiGet<PaginatedContacts>(`contacts?${params}`)
      setContacts(res.data)
    } catch {
      setContacts([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!search.trim()) { setContacts([]); return }
    debounceRef.current = setTimeout(() => doSearch(search), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, doSearch])

  function handleOpenChange(v: boolean) {
    setOpen(v)
    if (v) {
      setSearch('')
      setContacts([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleSelect(c: Contact) {
    onSelect(c)
    setOpen(false)
    setSearch('')
    setContacts([])
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onClear()
  }

  const isPhoneSearch = /^\d/.test(search.trim())
  const showEmpty = search.trim().length > 0 && !searching && contacts.length === 0

  // Measure trigger width to pass to popover
  const [triggerWidth, setTriggerWidth] = useState<number>(0)
  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth)
    }
  }, [open])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors',
            'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            open && 'ring-2 ring-ring ring-offset-2',
          )}
        >
          {selectedContact ? (
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                {(selectedContact.name ?? selectedContact.phone).charAt(0).toUpperCase()}
              </span>
              <span className="truncate font-medium">
                {selectedContact.name ?? selectedContact.phone}
              </span>
              {selectedContact.name && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {selectedContact.phone}
                </span>
              )}
            </span>
          ) : (
            <span className="flex min-w-0 flex-1 items-center gap-2 text-muted-foreground">
              <span>Nome ou número (ex: 5511999999999)</span>
            </span>
          )}

          <span className="ml-2 flex shrink-0 items-center gap-1">
            {selectedContact && (
              <span
                role="button"
                onClick={handleClear}
                className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </span>
            )}
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
        </button>
      </PopoverTrigger>

      {/* PopoverContent usa Portal — renderiza fora do Sheet, sem overflow clipping */}
      <PopoverContent
        style={{ width: triggerWidth || 'auto' }}
        className="p-0"
        align="start"
        sideOffset={4}
      >
        {/* Search input */}
        <div className="flex items-center border-b border-border px-3">
          <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato ou digitar número..."
            className="flex h-10 w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          />
          {searching && (
            <Loader2 className="ml-1 h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-[280px] overflow-y-auto">
          {!search.trim() && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Digite para buscar contatos
            </p>
          )}

          {contacts.length > 0 && (
            <div className="py-1">
              {contacts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
                    {(c.name ?? c.phone).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium leading-tight">
                      {c.name ?? c.phone}
                    </p>
                    {c.name && (
                      <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
                    )}
                  </div>
                  {selectedContact?.id === c.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}

          {showEmpty && (
            <div className="py-1">
              <button
                onClick={() => { onAddNew(search.trim()); setOpen(false) }}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-accent transition-colors"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground">
                  <UserPlus className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">Usar este número</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isPhoneSearch ? search.trim() : search.trim()}
                  </p>
                </div>
              </button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ---------------------------------------------------------------------------
// NewConversationDialog (agora Sheet)
// ---------------------------------------------------------------------------
export function NewConversationDialog({
  open,
  onClose,
  onConversationCreated,
}: NewConversationDialogProps) {
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [phoneOverride, setPhoneOverride] = useState('')   // número sem contato cadastrado
  const [showNameField, setShowNameField] = useState(false)
  const [contactName, setContactName] = useState('')
  const [message, setMessage] = useState('')
  const [instanceId, setInstanceId] = useState('')
  const [saving, setSaving] = useState(false)

  const instances = useInstancesStore((s) => s.instances)
  const connectedInstances = instances.filter((i) => i.status === 'CONNECTED')
  const upsertConversation = useInboxStore((s) => s.upsertConversation)
  const { fetchInstances } = useInstances()

  useEffect(() => {
    if (open) fetchInstances()
  }, [open, fetchInstances])

  useEffect(() => {
    if (connectedInstances.length > 0 && !instanceId) {
      setInstanceId(connectedInstances[0].id)
    }
  }, [connectedInstances, instanceId])

  function handleSelectContact(c: Contact) {
    setSelectedContact(c)
    setPhoneOverride('')
    setShowNameField(false)
    setContactName('')
  }

  function handleClearContact() {
    setSelectedContact(null)
    setPhoneOverride('')
    setShowNameField(false)
    setContactName('')
  }

  function handleAddNew(value: string) {
    setSelectedContact(null)
    setPhoneOverride(value)
    setShowNameField(true)
    setContactName('')
  }

  async function handleSubmit() {
    if (!instanceId) {
      toast({ title: 'Selecione uma instância conectada', variant: 'destructive' })
      return
    }
    if (!message.trim()) {
      toast({ title: 'Digite uma mensagem', variant: 'destructive' })
      return
    }

    const phone = selectedContact?.phone ?? phoneOverride.trim()
    if (!phone) {
      toast({ title: 'Selecione ou digite um contato', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload: Record<string, unknown> = { instanceId, phone, message: message.trim() }
      if (!selectedContact && showNameField && contactName.trim()) {
        payload.contactName = contactName.trim()
      }

      const res = await apiPost<{ data: Conversation }>('inbox/conversations/start', payload)
      upsertConversation(res.data)
      toast({ title: 'Conversa iniciada com sucesso', variant: 'success' })
      onConversationCreated(res.data.id)
      handleClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao iniciar conversa'
      toast({ title: msg, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setSelectedContact(null)
    setPhoneOverride('')
    setShowNameField(false)
    setContactName('')
    setMessage('')
    setInstanceId(connectedInstances[0]?.id ?? '')
    onClose()
  }

  const canSubmit =
    !saving &&
    connectedInstances.length > 0 &&
    message.trim().length > 0 &&
    (!!selectedContact || !!phoneOverride.trim())

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="flex flex-col p-0 sm:max-w-md">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <SheetTitle>Nova conversa</SheetTitle>
          <SheetDescription>
            Busque um contato ou digite o número para iniciar
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Contact combobox */}
          <div className="space-y-1.5">
            <Label>Contato ou número</Label>
            <ContactCombobox
              selectedContact={selectedContact}
              onSelect={handleSelectContact}
              onClear={handleClearContact}
              onAddNew={handleAddNew}
              disabled={saving}
            />

            {/* Nome para novo contato (número sem cadastro) */}
            {showNameField && phoneOverride && (
              <div className="mt-2 rounded-md border border-border bg-muted/30 px-3 py-3 space-y-2">
                <p className="text-xs text-muted-foreground">
                  Número <span className="font-mono font-medium text-foreground">{phoneOverride}</span> não encontrado nos contatos.
                </p>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <Input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Nome do contato (opcional)"
                    className="pl-8 bg-background"
                    disabled={saving}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Instance selector */}
          <div className="space-y-1.5">
            <Label>Instância WhatsApp</Label>
            {connectedInstances.length === 0 ? (
              <p className="text-xs text-destructive">
                Nenhuma instância conectada. Conecte uma antes de iniciar.
              </p>
            ) : (
              <Select value={instanceId} onValueChange={setInstanceId} disabled={saving}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a instância" />
                </SelectTrigger>
                <SelectContent>
                  {connectedInstances.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name}
                      {inst.phone && (
                        <span className="ml-1 text-muted-foreground text-xs">({inst.phone})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <Label>Mensagem</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite a primeira mensagem..."
              className="min-h-[120px] resize-none"
              disabled={saving}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
            />
            <p className="text-[11px] text-muted-foreground">Ctrl+Enter para enviar</p>
          </div>
        </div>

        <SheetFooter className="px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Enviando...
              </>
            ) : (
              'Iniciar conversa'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
