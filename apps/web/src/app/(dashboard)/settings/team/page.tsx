'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Pencil, UserX, UserCheck, Users, Search, ShieldCheck } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { toast } from '@/components/ui/toaster'
import { useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { USAGE_QUERY_KEY } from '@/components/layout/plan-usage'
import { useTranslations } from 'next-intl'
import { getInitials } from '@/lib/utils'

// ── Types ──

type UserRole = 'admin' | 'agent' | 'viewer'

interface TeamUser {
  id: string
  tenantId: string
  name: string
  email: string
  role: UserRole
  isSuperAdmin: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

interface PaginatedResponse {
  data: TeamUser[]
  meta: { page: number; limit: number; total: number; totalPages: number }
}

interface SingleResponse {
  data: TeamUser
}

const ROLE_VARIANTS: Record<UserRole, 'default' | 'info' | 'secondary'> = {
  admin: 'default',
  agent: 'info',
  viewer: 'secondary',
}

type DialogMode = 'create' | 'edit' | 'deactivate' | null

// ── Component ──

export default function TeamSettingsPage() {
  const t = useTranslations('settings.team')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const { user: currentUser } = useAuthStore()

  // If not admin, show access denied
  if (currentUser && currentUser.role !== 'admin' && !currentUser.isSuperAdmin) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.team') }]}>
        <EmptyState
          icon={ShieldCheck}
          title={t('accessDenied')}
          description={t('accessDeniedDesc')}
        />
      </PageLayout>
    )
  }

  return <TeamContent currentUserId={currentUser?.id ?? ''} />
}

function TeamContent({ currentUserId }: { currentUserId: string }) {
  const t = useTranslations('settings.team')
  const tc = useTranslations('common')
  const tn = useTranslations('nav')
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const queryClient = useQueryClient()

  const roleLabels: Record<UserRole, string> = {
    admin: t('roles.admin'),
    agent: t('roles.attendant'),
    viewer: t('roles.viewer'),
  }

  // Dialog state
  const [dialogMode, setDialogMode] = useState<DialogMode>(null)
  const [selectedUser, setSelectedUser] = useState<TeamUser | null>(null)

  // Create form
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<UserRole>('agent')

  // Password form
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiGet<PaginatedResponse>('users?limit=100')
      setUsers(res.data)
    } catch {
      toast({ title: t('error.loading'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users
    const q = search.toLowerCase()
    return users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, search])

  // ── Dialog openers ──

  const openCreateDialog = () => {
    setSelectedUser(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('agent')
    setDialogMode('create')
  }

  const openEditDialog = (user: TeamUser) => {
    setSelectedUser(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormRole(user.role)
    setNewPassword('')
    setConfirmPassword('')
    setDialogMode('edit')
  }

  const openDeactivateDialog = (user: TeamUser) => {
    setSelectedUser(user)
    setDialogMode('deactivate')
  }

  const closeDialog = () => {
    setDialogMode(null)
    setSelectedUser(null)
  }

  // ── Handlers ──

  const handleCreate = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) return
    if (formName.trim().length < 2) {
      toast({ title: t('validation.minName'), variant: 'destructive' })
      return
    }
    if (formPassword.length < 6) {
      toast({ title: t('validation.minPassword'), variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await apiPost<SingleResponse>('users', {
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword,
        role: formRole,
      })
      setUsers((prev) => [...prev, res.data])
      queryClient.invalidateQueries({ queryKey: USAGE_QUERY_KEY })
      toast({ title: t('success.created'), variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.creating')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedUser || !formName.trim()) return
    if (formName.trim().length < 2) {
      toast({ title: t('validation.minName'), variant: 'destructive' })
      return
    }
    if (newPassword && newPassword.length < 6) {
      toast({ title: t('validation.minPassword'), variant: 'destructive' })
      return
    }
    if (newPassword && newPassword !== confirmPassword) {
      toast({ title: t('validation.passwordMismatch'), variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await apiPatch<SingleResponse>(`users/${selectedUser.id}`, {
        name: formName.trim(),
        role: formRole,
      })
      if (newPassword) {
        await apiPatch(`users/${selectedUser.id}/password`, { password: newPassword })
      }
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.data : u)))
      toast({ title: t('success.updated'), variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.updating')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      await apiDelete(`users/${selectedUser.id}`)
      setUsers((prev) => prev.map((u) =>
        u.id === selectedUser.id ? { ...u, deletedAt: new Date().toISOString() } : u,
      ))
      toast({ title: t('success.deactivated'), variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : t('error.toggling')
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.team') }]}>
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-full max-w-xs" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.team') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length === 1 ? t('memberCount', { count: users.length }) : t('memberCountPlural', { count: users.length })}
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t('newMember')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? t('emptySearch') : t('emptyList')}
          description={search ? t('emptySearchDesc') : t('emptyListDesc')}
          action={!search ? { label: t('newMember'), onClick: openCreateDialog } : undefined}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {filteredUsers.map((member) => {
            const isSelf = member.id === currentUserId
            const isDeactivated = !!member.deletedAt
            const roleVariant = ROLE_VARIANTS[member.role]

            return (
              <div
                key={member.id}
                data-testid={`member-row-${member.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
              >
                {/* Avatar */}
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className={isDeactivated ? 'bg-muted text-muted-foreground' : 'bg-primary text-white text-[11px] font-semibold'}>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm truncate ${isDeactivated ? 'text-muted-foreground line-through' : ''}`}>
                      {member.name}
                    </span>
                    {isSelf && (
                      <Badge variant="secondary" className="text-[10px] shrink-0">{t('you')}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>

                {/* Role badge */}
                <Badge variant={roleVariant} className="text-[10px] shrink-0">
                  {roleLabels[member.role]}
                </Badge>

                {/* Status badge */}
                {isDeactivated ? (
                  <Badge variant="destructive" className="text-[10px] shrink-0">{t('deactivated')}</Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] shrink-0">{t('activeStatus')}</Badge>
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEditDialog(member)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{t('tooltips.editMember')}</TooltipContent>
                  </Tooltip>

                  {isDeactivated ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-green-600 hover:text-green-600"
                          disabled
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{t('tooltips.activateMember')}</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            disabled={isSelf}
                            onClick={() => openDeactivateDialog(member)}
                          >
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {isSelf ? t('tooltips.cannotDeactivateSelf') : t('tooltips.deactivateMember')}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Create Member Sheet ── */}
      <Sheet open={dialogMode === 'create'} onOpenChange={(open) => !open && closeDialog()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('create.title')}</SheetTitle>
            <SheetDescription>
              {t('create.description')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">{t('create.nameLabel')}</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('create.nameLabel')}
                minLength={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email">{t('create.emailLabel')}</Label>
              <Input
                id="create-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password">{t('create.passwordLabel')}</Label>
              <Input
                id="create-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder={t('validation.minPassword')}
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('create.roleLabel')}</Label>
              <div className="flex gap-2">
                {(['admin', 'agent', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormRole(r)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formRole === r
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName.trim() || !formEmail.trim() || !formPassword.trim()}
            >
              {saving ? t('create.creating') : tc('create')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Member Sheet ── */}
      <Sheet open={dialogMode === 'edit'} onOpenChange={(open) => !open && closeDialog()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('edit.title')}</SheetTitle>
            <SheetDescription>
              {t('edit.description')}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">{t('create.emailLabel')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-name">{t('create.nameLabel')}</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('create.nameLabel')}
                minLength={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t('create.roleLabel')}</Label>
              <div className="flex gap-2">
                {(['admin', 'agent', 'viewer'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormRole(r)}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      formRole === r
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-password">{t('edit.newPasswordLabel')}</Label>
              <Input
                id="edit-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t('edit.newPasswordPlaceholder')}
                minLength={6}
              />
            </div>

            {newPassword && (
              <div className="space-y-1.5">
                <Label htmlFor="edit-confirm-password">{t('password.confirmPassword')}</Label>
                <Input
                  id="edit-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('password.confirmPassword')}
                  minLength={6}
                />
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-destructive">{t('validation.passwordMismatch')}</p>
                )}
              </div>
            )}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog}>
              {tc('cancel')}
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving || !formName.trim() || (!!newPassword && (newPassword.length < 6 || newPassword !== confirmPassword))}
            >
              {saving ? t('password.saving') : tc('save')}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Deactivate Confirmation Dialog ── */}
      <Dialog open={dialogMode === 'deactivate'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('deactivate.title')}</DialogTitle>
            <DialogDescription>
              {t('deactivate.description', { name: selectedUser?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              {tc('cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={saving}>
              {saving ? t('deactivate.deactivating') : t('deactivate.button')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
