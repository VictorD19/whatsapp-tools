'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Search, ChevronsUpDown } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { apiGet } from '@/lib/api'
import { useDeal } from '@/hooks/use-deal'
import type { Contact } from '@/hooks/use-contacts'
import type { Pipeline } from '@/hooks/use-pipeline-stages'

const CONTACTS_PER_PAGE = 20

interface DealFormSheetProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
  pipelines: Pipeline[]
  defaultPipelineId?: string
}

interface PaginatedContactsResponse {
  data: Contact[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

// ─── Contact Picker with IntersectionObserver infinite scroll ────────────────

function ContactPicker({
  selected,
  onSelect,
}: {
  selected: Contact | null
  onSelect: (c: Contact) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchRef = useRef('')
  const pageRef = useRef(1)
  const hasMoreRef = useRef(true)
  const loadingRef = useRef(false)

  const fetchPage = useCallback(async (searchText: string, pageNum: number, append: boolean) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (searchText) params.set('search', searchText)
      params.set('page', String(pageNum))
      params.set('limit', String(CONTACTS_PER_PAGE))

      const res = await apiGet<PaginatedContactsResponse>(`contacts?${params}`)

      // Guard against stale responses
      if (searchText !== searchRef.current) return

      setContacts((prev) => append ? [...prev, ...res.data] : res.data)
      const nextHasMore = pageNum < res.meta.totalPages
      setPage(pageNum)
      pageRef.current = pageNum
      setHasMore(nextHasMore)
      hasMoreRef.current = nextHasMore
    } catch {
      // handled by api layer
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  // Reset and load first page when popover opens
  useEffect(() => {
    if (open) {
      searchRef.current = ''
      pageRef.current = 1
      hasMoreRef.current = true
      setSearch('')
      setContacts([])
      setPage(1)
      setHasMore(true)
      fetchPage('', 1, false)
    }
  }, [open, fetchPage])

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

    searchTimerRef.current = setTimeout(() => {
      searchRef.current = search
      pageRef.current = 1
      hasMoreRef.current = true
      setContacts([])
      setPage(1)
      setHasMore(true)
      fetchPage(search, 1, false)
    }, 300)

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    }
  }, [search, open, fetchPage])

  // IntersectionObserver for infinite scroll (same pattern as ixc-suite)
  useEffect(() => {
    const target = sentinelRef.current
    if (!target || !open) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMoreRef.current && !loadingRef.current) {
          fetchPage(searchRef.current, pageRef.current + 1, true)
        }
      },
      { threshold: 1 }
    )

    observer.observe(target)
    return () => observer.disconnect()
  }, [open, contacts.length, fetchPage])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between font-normal">
          <span className="truncate">
            {selected ? (selected.name ?? selected.phone) : 'Selecionar contato...'}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        {/* Search bar — always fixed at top */}
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-popover px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="Buscar por nome ou telefone..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
        </div>

        {/* Scrollable contact list — onWheel stopPropagation prevents Radix from swallowing wheel events */}
        <div
          className="max-h-[280px] overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
        >
          {contacts.length === 0 && !loading ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              Nenhum contato encontrado
            </p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false) }}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <div className="min-w-0 text-left">
                  <p className="text-xs font-medium truncate">{c.name ?? c.phone}</p>
                  {c.name && (
                    <p className="text-[11px] text-muted-foreground truncate">{c.phone}</p>
                  )}
                </div>
              </button>
            ))
          )}

          {/* Sentinel for IntersectionObserver */}
          <div ref={sentinelRef} className="h-1" />

          {loading && contacts.length > 0 && (
            <div className="flex justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Main Sheet ──────────────────────────────────────────────────────────────

export function DealFormSheet({ open, onClose, onCreated, pipelines, defaultPipelineId }: DealFormSheetProps) {
  const { createDeal } = useDeal()

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [pipelineId, setPipelineId] = useState(defaultPipelineId ?? '')
  const [stageId, setStageId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setSelectedContact(null)
      setTitle('')
      setValue('')
      setPipelineId(defaultPipelineId ?? pipelines[0]?.id ?? '')
      setStageId('')
    }
  }, [open, defaultPipelineId, pipelines])

  const selectedPipeline = useMemo(() => {
    return pipelines.find((p) => p.id === pipelineId)
  }, [pipelines, pipelineId])

  const sortedStages = useMemo(() => {
    return selectedPipeline?.stages
      .filter((s) => s.type === 'ACTIVE')
      .sort((a, b) => a.order - b.order) ?? []
  }, [selectedPipeline])

  async function handleSubmit() {
    if (!selectedContact) return
    setSaving(true)
    const dto: Parameters<typeof createDeal>[0] = {
      contactId: selectedContact.id,
    }
    if (title.trim()) dto.title = title.trim()
    if (value.trim()) {
      const num = parseFloat(value.replace(',', '.'))
      if (!isNaN(num) && num >= 0) dto.value = num
    }
    if (pipelineId) dto.pipelineId = pipelineId
    if (stageId) dto.stageId = stageId

    const result = await createDeal(dto)
    setSaving(false)
    if (result) onCreated()
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Novo negócio</SheetTitle>
          <SheetDescription>Crie um novo negócio no pipeline</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Contact selector */}
          <div className="space-y-2">
            <Label>Contato *</Label>
            <ContactPicker
              selected={selectedContact}
              onSelect={setSelectedContact}
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Venda de plano anual"
            />
          </div>

          {/* Value */}
          <div className="space-y-2">
            <Label>Valor (R$)</Label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          {/* Pipeline */}
          {pipelines.length > 1 && (
            <div className="space-y-2">
              <Label>Pipeline</Label>
              <Select value={pipelineId} onValueChange={(v) => { setPipelineId(v); setStageId('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stage */}
          {sortedStages.length > 0 && (
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger>
                  <SelectValue placeholder="Etapa padrão" />
                </SelectTrigger>
                <SelectContent>
                  {sortedStages.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selectedContact || saving}>
            {saving ? 'Criando...' : 'Criar negócio'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
