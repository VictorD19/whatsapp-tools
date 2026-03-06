'use client'

import React, { useCallback, useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { CsvUploadTab } from './csv-upload-tab'
import { SelectContactsTab } from './select-contacts-tab'
import { useContactLists } from '@/hooks/use-contact-lists'
import { toast } from '@/components/ui/toaster'

interface CreateListSheetProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateListSheet({ open, onClose, onCreated }: CreateListSheetProps) {
  const { createList, importCsv } = useContactLists()
  const [tab, setTab] = useState<'csv' | 'contacts'>('csv')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  // CSV state
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvRowCount, setCsvRowCount] = useState(0)

  // Contacts state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const handleCsvDataChange = useCallback((file: File | null, rows: Array<{ phone: string }>) => {
    setCsvFile(file)
    setCsvRowCount(rows.length)
  }, [])

  const handleContactsChange = useCallback((ids: string[]) => {
    setSelectedIds(ids)
  }, [])

  const canSubmit =
    name.trim().length > 0 &&
    ((tab === 'csv' && csvFile && csvRowCount > 0) ||
      (tab === 'contacts' && selectedIds.length > 0))

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setSaving(true)

    try {
      if (tab === 'csv' && csvFile) {
        await importCsv(name.trim(), csvFile, description.trim() || undefined)
      } else if (tab === 'contacts') {
        await createList(name.trim(), selectedIds, description.trim() || undefined)
      }

      toast({ title: 'Lista criada com sucesso' })
      onCreated()
      handleReset()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar lista'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }, [canSubmit, tab, csvFile, name, description, selectedIds, importCsv, createList, onCreated])

  const handleReset = useCallback(() => {
    setName('')
    setDescription('')
    setCsvFile(null)
    setCsvRowCount(0)
    setSelectedIds([])
    setTab('csv')
    onClose()
  }, [onClose])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleReset()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nova Lista de Contatos</SheetTitle>
          <SheetDescription>
            Crie uma lista a partir de CSV ou selecione contatos existentes
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">Nome da lista</Label>
            <Input
              id="list-name"
              placeholder="Ex: Leads Quentes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="list-desc">Descricao (opcional)</Label>
            <Textarea
              id="list-desc"
              placeholder="Breve descricao da lista..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'csv' | 'contacts')}>
            <TabsList className="w-full">
              <TabsTrigger value="csv" className="flex-1">
                CSV
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1">
                Contatos Existentes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="csv">
              <CsvUploadTab onDataChange={handleCsvDataChange} />
            </TabsContent>

            <TabsContent value="contacts">
              <SelectContactsTab
                selectedIds={selectedIds}
                onSelectionChange={handleContactsChange}
              />
            </TabsContent>
          </Tabs>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={handleReset}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? 'Criando...' : 'Criar Lista'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
