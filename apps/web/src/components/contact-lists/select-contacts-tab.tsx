'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { apiGet } from '@/lib/api'

interface Contact {
  id: string
  phone: string
  name: string | null
}

interface PaginatedResponse {
  data: Contact[]
  meta: { total: number }
}

interface SelectContactsTabProps {
  selectedIds: string[]
  onSelectionChange: (ids: string[], contacts: Contact[]) => void
}

export function SelectContactsTab({ selectedIds, onSelectionChange }: SelectContactsTabProps) {
  const [search, setSearch] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  const fetchContacts = useCallback(async (query?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (query) params.set('search', query)
      params.set('limit', '50')
      const res = await apiGet<PaginatedResponse>(`contacts?${params}`)
      setContacts(res.data)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleSearch = useCallback(
    (value: string) => {
      setSearch(value)
      clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchContacts(value || undefined)
      }, 300)
    },
    [fetchContacts],
  )

  const toggleContact = useCallback(
    (contact: Contact) => {
      const isSelected = selectedIds.includes(contact.id)
      let newSelected: Contact[]

      if (isSelected) {
        newSelected = selectedContacts.filter((c) => c.id !== contact.id)
      } else {
        newSelected = [...selectedContacts, contact]
      }

      setSelectedContacts(newSelected)
      onSelectionChange(
        newSelected.map((c) => c.id),
        newSelected,
      )
    },
    [selectedIds, selectedContacts, onSelectionChange],
  )

  const removeSelected = useCallback(
    (id: string) => {
      const newSelected = selectedContacts.filter((c) => c.id !== id)
      setSelectedContacts(newSelected)
      onSelectionChange(
        newSelected.map((c) => c.id),
        newSelected,
      )
    },
    [selectedContacts, onSelectionChange],
  )

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedContacts.map((c) => (
            <Badge key={c.id} variant="secondary" className="gap-1 pr-1">
              <span className="text-xs">{c.name || c.phone}</span>
              <button
                type="button"
                onClick={() => removeSelected(c.id)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground self-center ml-1">
            {selectedContacts.length} selecionado{selectedContacts.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Contact list */}
      <div className="max-h-[300px] overflow-y-auto rounded-md border border-border">
        {loading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            {search ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado'}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {contacts.map((contact) => {
              const isSelected = selectedIds.includes(contact.id)
              return (
                <label
                  key={contact.id}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleContact(contact)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {contact.name || 'Sem nome'}
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {contact.phone}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
