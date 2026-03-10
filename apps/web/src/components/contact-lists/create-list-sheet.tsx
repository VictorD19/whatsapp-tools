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
import { useTranslations } from 'next-intl'
import { useContactLists } from '@/hooks/use-contact-lists'
import { toast } from '@/components/ui/toaster'

interface CreateListSheetProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateListSheet({ open, onClose, onCreated }: CreateListSheetProps) {
  const t = useTranslations('contactLists')
  const tc = useTranslations('common')
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

      toast({ title: t('success.created'), variant: 'success' })
      onCreated()
      handleReset()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.creating')
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
          <SheetTitle>{t('newListTitle')}</SheetTitle>
          <SheetDescription>
            {t('newListDescription')}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="list-name">{t('listName')}</Label>
            <Input
              id="list-name"
              placeholder={t('listNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="list-desc">{t('descriptionLabel')}</Label>
            <Textarea
              id="list-desc"
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Tabs */}
          <Tabs value={tab} onValueChange={(v) => setTab(v as 'csv' | 'contacts')}>
            <TabsList className="w-full">
              <TabsTrigger value="csv" className="flex-1">
                {t('csvTab')}
              </TabsTrigger>
              <TabsTrigger value="contacts" className="flex-1">
                {t('contactsTab')}
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
            {tc('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
            {saving ? t('creating') : t('createList')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
