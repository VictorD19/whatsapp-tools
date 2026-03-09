'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Pencil,
  CreditCard,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Users,
  Building,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toaster'
import { apiGet, apiPost, apiPatch } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'

// ── Types ──

interface Plan {
  id: string
  name: string
  slug: string
  description: string | null
  benefits: string[]
  maxInstances: number
  maxUsers: number
  maxAssistants: number
  maxBroadcastsPerDay: number
  maxContactsPerBroadcast: number
  price: number | null
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  _count?: {
    tenants: number
  }
}

interface PaginatedResponse {
  data: Plan[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
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

export default function PlansPage() {
  React.useEffect(() => { document.title = 'Planos | SistemaZapChat' }, [])

  const router = useRouter()
  const { user } = useAuthStore()

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // List state
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 })

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formName, setFormName] = useState('')
  const [formSlug, setFormSlug] = useState('')
  const [formSlugManual, setFormSlugManual] = useState(false)
  const [formDescription, setFormDescription] = useState('')
  const [formBenefits, setFormBenefits] = useState<string[]>([])
  const [formBenefitInput, setFormBenefitInput] = useState('')
  const [formMaxInstances, setFormMaxInstances] = useState(3)
  const [formMaxUsers, setFormMaxUsers] = useState(5)
  const [formMaxAssistants, setFormMaxAssistants] = useState(1)
  const [formMaxBroadcastsPerDay, setFormMaxBroadcastsPerDay] = useState(5)
  const [formMaxContactsPerBroadcast, setFormMaxContactsPerBroadcast] = useState(500)
  const [formPrice, setFormPrice] = useState('')
  const [formSortOrder, setFormSortOrder] = useState(0)
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formIsActive, setFormIsActive] = useState(true)

  // Auto-generate slug from name (create only)
  useEffect(() => {
    if (!formSlugManual && !editingPlan) {
      setFormSlug(toSlug(formName))
    }
  }, [formName, formSlugManual, editingPlan])

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch plans
  const fetchPlans = useCallback(async (currentPage: number, searchQuery: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: '20',
      })
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim())
      }
      const res = await apiGet<PaginatedResponse>(`admin/plans?${params.toString()}`)
      setPlans(res.data)
      setMeta(res.meta)
    } catch {
      toast({ title: 'Erro ao carregar planos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mounted && user?.isSuperAdmin) {
      fetchPlans(page, debouncedSearch)
    }
  }, [mounted, user?.isSuperAdmin, page, debouncedSearch, fetchPlans])

  // ── Handlers ──

  const resetForm = () => {
    setFormName('')
    setFormSlug('')
    setFormSlugManual(false)
    setFormDescription('')
    setFormBenefits([])
    setFormBenefitInput('')
    setFormMaxInstances(3)
    setFormMaxUsers(5)
    setFormMaxAssistants(1)
    setFormMaxBroadcastsPerDay(5)
    setFormMaxContactsPerBroadcast(500)
    setFormPrice('')
    setFormSortOrder(0)
    setFormIsDefault(false)
    setFormIsActive(true)
  }

  const openCreateDialog = () => {
    setEditingPlan(null)
    resetForm()
    setDialogOpen(true)
  }

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan)
    setFormName(plan.name)
    setFormSlug(plan.slug)
    setFormSlugManual(true)
    setFormDescription(plan.description ?? '')
    setFormBenefits(plan.benefits ?? [])
    setFormBenefitInput('')
    setFormMaxInstances(plan.maxInstances)
    setFormMaxUsers(plan.maxUsers)
    setFormMaxAssistants(plan.maxAssistants)
    setFormMaxBroadcastsPerDay(plan.maxBroadcastsPerDay)
    setFormMaxContactsPerBroadcast(plan.maxContactsPerBroadcast)
    setFormPrice(plan.price != null ? String(plan.price) : '')
    setFormSortOrder(plan.sortOrder)
    setFormIsDefault(plan.isDefault)
    setFormIsActive(plan.isActive)
    setDialogOpen(true)
  }

  const addBenefit = () => {
    const value = formBenefitInput.trim()
    if (value && !formBenefits.includes(value)) {
      setFormBenefits([...formBenefits, value])
      setFormBenefitInput('')
    }
  }

  const removeBenefit = (index: number) => {
    setFormBenefits(formBenefits.filter((_, i) => i !== index))
  }

  const buildPayload = () => ({
    name: formName.trim(),
    ...(editingPlan ? {} : { slug: formSlug.trim() }),
    description: formDescription.trim() || null,
    benefits: formBenefits,
    maxInstances: formMaxInstances,
    maxUsers: formMaxUsers,
    maxAssistants: formMaxAssistants,
    maxBroadcastsPerDay: formMaxBroadcastsPerDay,
    maxContactsPerBroadcast: formMaxContactsPerBroadcast,
    price: formPrice ? Number(formPrice) : null,
    sortOrder: formSortOrder,
    isDefault: formIsDefault,
    isActive: formIsActive,
  })

  const handleSave = async () => {
    if (!formName.trim()) return
    if (!editingPlan && !formSlug.trim()) return

    setSaving(true)
    try {
      if (editingPlan) {
        const res = await apiPatch<{ data: Plan }>(`admin/plans/${editingPlan.id}`, buildPayload())
        setPlans((prev) =>
          prev.map((p) => (p.id === editingPlan.id ? { ...p, ...res.data } : p)),
        )
        toast({ title: 'Plano atualizado', variant: 'success' })
      } else {
        await apiPost<{ data: Plan }>('admin/plans', buildPayload())
        toast({ title: 'Plano criado com sucesso', variant: 'success' })
        fetchPlans(page, debouncedSearch)
      }
      setDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao salvar plano'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (plan: Plan) => {
    try {
      const res = await apiPatch<{ data: Plan }>(`admin/plans/${plan.id}`, {
        isActive: !plan.isActive,
      })
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, ...res.data } : p)),
      )
      toast({
        title: res.data.isActive ? 'Plano ativado' : 'Plano desativado',
        variant: 'success',
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar status'
      toast({ title: message, variant: 'destructive' })
    }
  }

  const handleSlugChange = (value: string) => {
    setFormSlugManual(true)
    setFormSlug(toSlug(value))
  }

  // ── Access control ──

  if (!mounted) return null

  if (!user?.isSuperAdmin) {
    router.replace('/inbox')
    return null
  }

  // ── Render: Loading ──

  if (loading && plans.length === 0) {
    return (
      <PageLayout breadcrumb={[{ label: 'Administração' }, { label: 'Planos' }]}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <Skeleton className="h-9 w-72" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </PageLayout>
    )
  }

  // ── Render: Page ──

  const formValid = formName.trim() && (editingPlan || formSlug.trim())

  return (
    <PageLayout breadcrumb={[{ label: 'Administração' }, { label: 'Planos' }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Planos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os planos disponiveis na plataforma
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Plans list */}
      {plans.length === 0 && !loading ? (
        <EmptyState
          icon={CreditCard}
          title={debouncedSearch ? 'Nenhum plano encontrado' : 'Nenhum plano cadastrado'}
          description={
            debouncedSearch
              ? 'Tente buscar com outros termos'
              : 'Crie o primeiro plano para comecar'
          }
          action={
            debouncedSearch
              ? undefined
              : { label: 'Criar plano', onClick: openCreateDialog }
          }
        />
      ) : (
        <>
          <div className="rounded-md border border-border overflow-hidden">
            {/* Table header */}
            <div className="hidden sm:grid sm:grid-cols-[1fr_120px_120px_80px_80px] gap-4 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Plano</span>
              <span>Limites</span>
              <span>Tenants</span>
              <span>Status</span>
              <span className="text-right">Acoes</span>
            </div>

            {/* Rows */}
            {plans.map((plan) => (
              <div
                key={plan.id}
                data-testid={`plan-row-${plan.id}`}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_120px_120px_80px_80px] gap-2 sm:gap-4 sm:items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {/* Name + slug + description */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{plan.name}</p>
                    {plan.isDefault && (
                      <Badge variant="secondary" className="text-[10px]">
                        Padrao
                      </Badge>
                    )}
                    {plan.price != null && (
                      <span className="text-xs text-muted-foreground">
                        R$ {Number(plan.price).toFixed(2)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{plan.slug}</p>
                </div>

                {/* Limits */}
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>{plan.maxInstances} inst.</span>
                  <span>{plan.maxUsers} users</span>
                </div>

                {/* Tenants count */}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building className="h-3 w-3" />
                  {plan._count?.tenants ?? 0}
                </div>

                {/* Status */}
                <div>
                  <button
                    onClick={() => handleToggleActive(plan)}
                    className="cursor-pointer"
                  >
                    <Badge
                      variant={plan.isActive ? 'default' : 'secondary'}
                      className="text-[10px]"
                    >
                      {plan.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-0.5 sm:justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEditDialog(plan)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {meta.total} {meta.total === 1 ? 'plano' : 'planos'}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
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
                  Proximo
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Create / Edit Plan Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
            <DialogDescription>
              {editingPlan
                ? `Altere as informacoes do plano ${editingPlan.name}`
                : 'Crie um novo plano para a plataforma'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="plan-name">Nome</Label>
              <Input
                id="plan-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Pro"
                maxLength={100}
              />
            </div>

            {/* Slug (only on create) */}
            {!editingPlan && (
              <div className="space-y-1.5">
                <Label htmlFor="plan-slug">Slug</Label>
                <Input
                  id="plan-slug"
                  value={formSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="pro"
                  maxLength={50}
                />
                <p className="text-[11px] text-muted-foreground">
                  Identificador unico. Apenas letras minusculas, numeros e hifens.
                </p>
              </div>
            )}

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="plan-description">Descricao</Label>
              <Textarea
                id="plan-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Descricao do plano..."
                rows={2}
              />
            </div>

            {/* Benefits */}
            <div className="space-y-1.5">
              <Label>Beneficios</Label>
              <div className="flex gap-2">
                <Input
                  value={formBenefitInput}
                  onChange={(e) => setFormBenefitInput(e.target.value)}
                  placeholder="Ex: 10 instancias"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addBenefit()
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={addBenefit}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {formBenefits.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {formBenefits.map((b, i) => (
                    <Badge key={i} variant="secondary" className="gap-1 pr-1">
                      {b}
                      <button
                        type="button"
                        onClick={() => removeBenefit(i)}
                        className="ml-0.5 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Limits */}
            <p className="text-sm font-medium text-muted-foreground">Limites</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plan-max-instances">Max instancias</Label>
                <Input
                  id="plan-max-instances"
                  type="number"
                  min={1}
                  value={formMaxInstances}
                  onChange={(e) => setFormMaxInstances(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-max-users">Max usuarios</Label>
                <Input
                  id="plan-max-users"
                  type="number"
                  min={1}
                  value={formMaxUsers}
                  onChange={(e) => setFormMaxUsers(Number(e.target.value) || 1)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-max-assistants">Max assistentes</Label>
                <Input
                  id="plan-max-assistants"
                  type="number"
                  min={0}
                  value={formMaxAssistants}
                  onChange={(e) => setFormMaxAssistants(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-max-broadcasts">Disparos/dia</Label>
                <Input
                  id="plan-max-broadcasts"
                  type="number"
                  min={0}
                  value={formMaxBroadcastsPerDay}
                  onChange={(e) => setFormMaxBroadcastsPerDay(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-max-contacts">Contatos/disparo</Label>
                <Input
                  id="plan-max-contacts"
                  type="number"
                  min={0}
                  value={formMaxContactsPerBroadcast}
                  onChange={(e) => setFormMaxContactsPerBroadcast(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plan-price">Preco (R$)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <Separator />

            {/* Toggles */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="plan-sort-order">Ordem</Label>
                <Input
                  id="plan-sort-order"
                  type="number"
                  min={0}
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Padrao</Label>
                <Button
                  type="button"
                  variant={formIsDefault ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => setFormIsDefault(!formIsDefault)}
                >
                  {formIsDefault ? <Check className="h-4 w-4 mr-1" /> : null}
                  {formIsDefault ? 'Sim' : 'Nao'}
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label>Ativo</Label>
                <Button
                  type="button"
                  variant={formIsActive ? 'default' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={() => setFormIsActive(!formIsActive)}
                >
                  {formIsActive ? <Check className="h-4 w-4 mr-1" /> : null}
                  {formIsActive ? 'Sim' : 'Nao'}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving || !formValid}>
              {saving ? 'Salvando...' : editingPlan ? 'Salvar' : 'Criar Plano'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
