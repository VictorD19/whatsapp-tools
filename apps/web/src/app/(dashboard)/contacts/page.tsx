'use client'

import React, { useCallback, useState } from 'react'
import { Plus, Search, UserCircle, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useContacts, type Contact } from '@/hooks/use-contacts'
import { useDebounce } from '@/hooks/use-debounce'
import { useTranslations } from 'next-intl'
import { cn, getInitials, formatPhone, formatDate } from '@/lib/utils'
import { toast } from '@/components/ui/toaster'

export default function ContactsPage() {
  const t = useTranslations('contacts')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')

  React.useEffect(() => { document.title = 'Contatos | SistemaZapChat' }, [])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { contacts, initialLoading, fetching, meta, createContact, updateContact, deleteContact } =
    useContacts({ search: debouncedSearch || undefined, page })

  // Sheet state (create/edit)
  const [formOpen, setFormOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [formPhone, setFormPhone] = useState('')
  const [formName, setFormName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handlePageChange = useCallback((p: number) => {
    setPage(p)
  }, [])

  // Open create sheet
  const openCreate = useCallback(() => {
    setEditingContact(null)
    setFormPhone('')
    setFormName('')
    setFormOpen(true)
  }, [])

  // Open edit sheet
  const openEdit = useCallback((contact: Contact) => {
    setEditingContact(contact)
    setFormPhone(contact.phone)
    setFormName(contact.name ?? '')
    setFormOpen(true)
  }, [])

  // Open delete dialog
  const openDelete = useCallback((contact: Contact) => {
    setDeletingContact(contact)
    setDeleteOpen(true)
  }, [])

  // Submit create/edit
  const handleSubmit = useCallback(async () => {
    if (!formPhone.trim()) return
    setSubmitting(true)
    try {
      if (editingContact) {
        await updateContact(editingContact.id, {
          phone: formPhone.trim(),
          name: formName.trim() || undefined,
        })
      } else {
        await createContact({
          phone: formPhone.trim(),
          name: formName.trim() || undefined,
        })
      }
      setFormOpen(false)
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : t('errorSaving')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [editingContact, formPhone, formName, createContact, updateContact])

  // Confirm delete
  const handleDelete = useCallback(async () => {
    if (!deletingContact) return
    setSubmitting(true)
    try {
      await deleteContact(deletingContact.id)
      setDeleteOpen(false)
      setDeletingContact(null)
    } catch {
      toast({ title: t('errorRemoving'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }, [deletingContact, deleteContact])

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.marketing') }, { label: tn('items.contacts') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {meta.total === 1 ? t('contactCount', { count: meta.total }) : t('contactCountPlural', { count: meta.total })}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          {t('new')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchByNameOrPhone')}
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      {initialLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : contacts.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title={search ? t('noContactFound') : t('noContactYet')}
          description={
            search
              ? t('tryOtherTerms')
              : t('contactsAutoCreated')
          }
          {...(!search && { action: { label: t('new'), onClick: openCreate } })}
        />
      ) : (
        <>
          <div className={cn('rounded-md border border-border overflow-hidden transition-opacity duration-200', fetching && 'opacity-50 pointer-events-none')}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('contactHeader')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('phoneHeader')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('tagsHeader')}
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('createdAtHeader')}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {t('actionsHeader')}
                  </th>
                </tr>
              </thead>
              <tbody
                key={`page-${meta.page}-${search}`}
                className="divide-y divide-border animate-fade-slide-in"
              >
                {contacts.map((c) => (
                  <tr key={c.id} data-testid={`contact-row-${c.id}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-xs">
                            {c.name ? getInitials(c.name) : '#'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{c.name || t('noName')}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatPhone(c.phone)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.contactTags?.map((ct) => (
                          <Badge key={ct.tag.id} variant="secondary" className="text-xs">
                            {ct.tag.name}
                          </Badge>
                        ))}
                        {(!c.contactTags || c.contactTags.length === 0) && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(c.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openDelete(c)}>
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t('pageOf', { page: meta.page, totalPages: meta.totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page <= 1}
                  onClick={() => handlePageChange(meta.page - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={meta.page >= meta.totalPages}
                  onClick={() => handlePageChange(meta.page + 1)}
                >
                  {t('nextPage')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create/Edit Sheet (lateral) */}
      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editingContact ? t('editContact') : t('newContact')}</SheetTitle>
            <SheetDescription>
              {editingContact
                ? t('editDescription')
                : t('newDescription')}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phoneLabel')}</Label>
              <Input
                id="phone"
                placeholder="5511999999999"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">{t('nameOptional')}</Label>
              <Input
                id="name"
                placeholder={t('namePlaceholder')}
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!formPhone.trim() || submitting}>
              {submitting ? t('saving') : editingContact ? tc('save') : tc('create')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('removeContact')}</DialogTitle>
            <DialogDescription>
              {t('removeConfirmation', { name: deletingContact?.name || deletingContact?.phone || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {submitting ? t('removing') : t('remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
