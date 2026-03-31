'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  Trash2,
  Building,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Radio,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth.store'
import { formatDate } from '@/lib/formatting'

// ── Types ──

interface PlanOption {
  id: string
  name: string
  slug: string
  description: string | null
  maxInstances: number
  maxUsers: number
  isDefault: boolean
}

interface TenantAdmin {
  id: string
  email: string
  name: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  planId: string
  plan?: { id: string; name: string; slug: string }
  users?: TenantAdmin[]
  createdAt: string
  updatedAt: string
  _count?: {
    users: number
    instances: number
  }
}

interface PaginatedResponse {
  data: Tenant[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

interface SingleResponse {
  data: Tenant
}

// ── Slug helper ──

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-\s]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Component ──

export default function TenantsPage() {
  const t = useTranslations('admin.tenants')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const router = useRouter()
  const { user } = useAuthStore()

  // Access control
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Plans
  const [activePlans, setActivePlans] = useState<PlanOption[]>([])
  const [loadingPlans, setLoadingPlans] = useState(false)

  // List state
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null)
  const [saving, setSaving] = useState(false)

  // Create form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formSlugManual, setFormSlugManual] = useState(false)
  const [formPlanId, setFormPlanId] = useState('')
  const [formAdminName, setFormAdminName] = useState('')
  const [formAdminEmail, setFormAdminEmail] = useState('')
  const [formAdminPassword, setFormAdminPassword] = useState('')

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editPlanId, setEditPlanId] = useState('')
  const [editAdminEmail, setEditAdminEmail] = useState('')
  const [editAdminPassword, setEditAdminPassword] = useState('')

  // Auto-generate slug from name
  useEffect(() => {
    if (!formSlugManual) {
      setFormSlug(toSlug(formName))
    }
  }, [formName, formSlugManual])

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch active plans
  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true)
    try {
      const res = await apiGet<{ data: PlanOption[] }>('admin/plans/active')
      setActivePlans(res.data)
    } catch {
      toast({ title: t('error.loading'), variant: 'destructive' })
    } finally {
      setLoadingPlans(false)
    }
  }, [])

  // Fetch tenants
  const fetchTenants = useCallback(async (currentPage: number, searchQuery: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '20',
      })
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      const res = await apiGet<PaginatedResponse>(`admin/tenants?${params.toString()}`)
      setTenants(res.data)
      setMeta(res.meta)
    } catch {
      toast({ title: t('error.loading'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted && user?.isSuperAdmin) {
      fetchPlans()
      fetchTenants(page, debouncedSearch)
    }
  }, [mounted, user?.isSuperAdmin, page, debouncedSearch, fetchPlans, fetchTenants])

  // ── Handlers ──

  const getDefaultPlanId = () => {
    const defaultPlan = activePlans.find((p) => p.isDefault)
    return defaultPlan?.id ?? activePlans[0]?.id ?? ''
  }

  const openCreateDialog = () => {
    setFormName('')
    setFormSlug('')
    setFormSlugManual(false)
    setFormPlanId(getDefaultPlanId())
    setFormAdminName('')
    setFormAdminEmail('')
    setFormAdminPassword('')
    setCreateOpen(true)
  }

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant)
    setEditName(tenant.name)
    setEditPlanId(tenant.plan?.id ?? tenant.planId)
    setEditAdminEmail(tenant.users?.[0]?.email ?? '')
    setEditAdminPassword('')
    setEditOpen(true)
  }

  const openDeleteDialog = (tenant: Tenant) => {
    setDeletingTenant(tenant)
    setDeleteOpen(true)
  }

  const handleCreate = async () => {
    if (!formName.trim() || !formSlug.trim() || !formPlanId || !formAdminName.trim() || !formAdminEmail.trim() || !formAdminPassword.trim()) return
    if (formAdminPassword.length < 6) {
      toast({ title: t('validation.minPassword'), variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await apiPost<SingleResponse>('admin/tenants', {
        name: formName.trim(),
        slug: formSlug.trim(),
        planId: formPlanId,
        adminName: formAdminName.trim(),
        adminEmail: formAdminEmail.trim(),
        adminPassword: formAdminPassword,
      })
      toast({ title: t('success.created'), variant: 'success' })
      setCreateOpen(false)
      fetchTenants(page, debouncedSearch)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.creating')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingTenant || !editName.trim() || !editPlanId) return
    if (editAdminPassword && editAdminPassword.length < 6) {
      toast({ title: t('validation.minPassword'), variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        name: editName.trim(),
        planId: editPlanId,
      }
      if (editAdminPassword) {
        payload.adminPassword = editAdminPassword
      }
      const res = await apiPatch<SingleResponse>(`admin/tenants/${editingTenant.id}`, payload)
      setTenants((prev) =>
        prev.map((t) => (t.id === editingTenant.id ? { ...t, ...res.data } : t)),
      )
      toast({ title: t('success.updated'), variant: 'success' })
      setEditOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.updating')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingTenant) return
    setSaving(true)
    try {
      await apiDelete(`admin/tenants/${deletingTenant.id}`)
      toast({ title: t('success.deleted'), variant: 'success' })
      setDeleteOpen(false)
      fetchTenants(page, debouncedSearch)
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.deleting')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleSlugChange = (value: string) => {
    setFormSlugManual(true)
    setFormSlug(toSlug(value))
  }

  // ── Access control ──

  if (!mounted) {
    return null
  }

  if (!user?.isSuperAdmin) {
    router.replace('/inbox')
    return null
  }

  // ── Render: Loading ──

  if (loading && tenants.length === 0) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.admin') }, { label: tn('items.tenants') }]}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-9 w-72" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </PageLayout>
    )
  }

  // ── Render: Page ──

  const createFormValid =
    formName.trim() &&
    formSlug.trim() &&
    formPlanId &&
    formAdminName.trim() &&
    formAdminEmail.trim() &&
    formAdminPassword.length >= 6

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.admin') }, { label: tn('items.tenants') }]}>
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
          {t('newTenant')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Tenants list */}
      {tenants.length === 0 && !loading ? (
        <EmptyState
          icon={Building}
          title={debouncedSearch ? t('emptySearch') : t('empty')}
          description={
            debouncedSearch
              ? tc('noResults')
              : t('subtitle')
          }
          action={
            debouncedSearch
              ? undefined
              : { label: t('newTenant'), onClick: openCreateDialog }
          }
        />
      ) : (
        <>
          <div className="rounded-md border border-border overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_1fr_100px_140px_100px_80px] gap-4 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>{t('table.tenant')}</span>
              <span>{t('table.adminEmail')}</span>
              <span>{t('table.plan')}</span>
              <span>{t('table.resources')}</span>
              <span>{t('table.createdAt')}</span>
              <span className="text-right">{t('table.actions')}</span>
            </div>

            {/* Rows */}
            {tenants.map((tenant) => (
              <div
                key={tenant.id}
                data-testid={`tenant-row-${tenant.id}`}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_1fr_100px_140px_100px_80px] gap-2 sm:gap-4 sm:items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {/* Name + slug */}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{tenant.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{tenant.slug}</p>
                </div>

                {/* Admin email */}
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground truncate">
                    {tenant.users?.[0]?.email ?? '—'}
                  </p>
                </div>

                {/* Plan badge */}
                <div>
                  <Badge variant="secondary" className="text-[10px]">
                    {tenant.plan?.name ?? '—'}
                  </Badge>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {tenant._count?.users ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Radio className="h-3 w-3" />
                    {tenant._count?.instances ?? 0}
                  </span>
                </div>

                {/* Created at */}
                <span className="text-xs text-muted-foreground">
                  {formatDate(tenant.createdAt)}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-0.5 sm:justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditDialog(tenant)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => openDeleteDialog(tenant)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {meta.total} {t('title').toLowerCase()}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t('pagination.previous')}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  {t('pagination.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create Tenant Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('create.title')}</DialogTitle>
            <DialogDescription>
              {t('create.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Company name */}
            <div className="space-y-1.5">
              <Label htmlFor="create-name">{t('create.companyName')}</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('create.companyNamePlaceholder')}
                maxLength={100}
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <Label htmlFor="create-slug">{t('create.slug')}</Label>
              <Input
                id="create-slug"
                value={formSlug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder={t('create.slugPlaceholder')}
                maxLength={60}
              />
              <p className="text-[11px] text-muted-foreground">
                {t('create.slugHint')}
              </p>
            </div>

            {/* Plan select */}
            <div className="space-y-1.5">
              <Label>{t('create.plan')}</Label>
              {loadingPlans ? (
                <Skeleton className="h-9 w-full" />
              ) : activePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('create.noPlan')}{' '}
                  <a href="/admin/plans" className="underline hover:text-foreground">
                    {t('create.createPlan')}
                  </a>
                </p>
              ) : (
                <Select value={formPlanId} onValueChange={setFormPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('create.selectPlan')} />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.isDefault ? ` (${t('default')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Admin section */}
            <p className="text-sm font-medium text-muted-foreground">{t('create.adminSection')}</p>

            <div className="space-y-1.5">
              <Label htmlFor="create-admin-name">{t('create.adminName')}</Label>
              <Input
                id="create-admin-name"
                value={formAdminName}
                onChange={(e) => setFormAdminName(e.target.value)}
                placeholder={t('create.adminNamePlaceholder')}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-admin-email">{t('create.adminEmail')}</Label>
              <Input
                id="create-admin-email"
                type="email"
                value={formAdminEmail}
                onChange={(e) => setFormAdminEmail(e.target.value)}
                placeholder={t('create.adminEmailPlaceholder')}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-admin-password">{t('create.adminPassword')}</Label>
              <Input
                id="create-admin-password"
                type="password"
                value={formAdminPassword}
                onChange={(e) => setFormAdminPassword(e.target.value)}
                placeholder={t('create.adminPasswordPlaceholder')}
                minLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={saving || !createFormValid}>
              {saving ? t('create.creating') : t('newTenant')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Tenant Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('edit.title')}</DialogTitle>
            <DialogDescription>
              {t('edit.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t('create.companyName')}</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('create.plan')}</Label>
              {loadingPlans ? (
                <Skeleton className="h-9 w-full" />
              ) : activePlans.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t('create.noPlan')}{' '}
                  <a href="/admin/plans" className="underline hover:text-foreground">
                    {t('create.createPlan')}
                  </a>
                </p>
              ) : (
                <Select value={editPlanId} onValueChange={setEditPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('create.selectPlan')} />
                  </SelectTrigger>
                  <SelectContent>
                    {activePlans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.isDefault ? ` (${t('default')})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            <p className="text-sm font-medium text-muted-foreground">{t('create.adminSection')}</p>

            <div className="space-y-1.5">
              <Label htmlFor="edit-admin-email">{t('create.adminEmail')}</Label>
              <Input
                id="edit-admin-email"
                type="email"
                value={editAdminEmail}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-admin-password">{t('edit.newPasswordLabel')}</Label>
              <Input
                id="edit-admin-password"
                type="password"
                value={editAdminPassword}
                onChange={(e) => setEditAdminPassword(e.target.value)}
                placeholder={t('edit.newPasswordPlaceholder')}
                minLength={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !editName.trim() || !editPlanId || (!!editAdminPassword && editAdminPassword.length < 6)}
            >
              {saving ? tc('loading') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('delete.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('delete.description', { name: deletingTenant?.name, strong: (chunks) => <strong>{chunks}</strong> })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
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
