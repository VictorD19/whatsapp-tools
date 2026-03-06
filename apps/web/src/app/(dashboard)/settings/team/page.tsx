'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Pencil, KeyRound, UserX, UserCheck, Users, Search, ShieldCheck } from 'lucide-react'
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
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
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

const ROLE_CONFIG: Record<UserRole, { label: string; variant: 'default' | 'info' | 'secondary' }> = {
  admin: { label: 'Admin', variant: 'default' },
  agent: { label: 'Atendente', variant: 'info' },
  viewer: { label: 'Visualizador', variant: 'secondary' },
}

type DialogMode = 'create' | 'edit' | 'password' | 'deactivate' | null

// ── Component ──

export default function TeamSettingsPage() {
  const { user: currentUser } = useAuthStore()

  // If not admin, show access denied
  if (currentUser && currentUser.role !== 'admin' && !currentUser.isSuperAdmin) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
        <EmptyState
          icon={ShieldCheck}
          title="Acesso negado"
          description="Apenas administradores podem gerenciar a equipe."
        />
      </div>
    )
  }

  return <TeamContent currentUserId={currentUser?.id ?? ''} />
}

function TeamContent({ currentUserId }: { currentUserId: string }) {
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

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
      toast({ title: 'Erro ao carregar equipe', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [])

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
    setFormRole(user.role)
    setDialogMode('edit')
  }

  const openPasswordDialog = (user: TeamUser) => {
    setSelectedUser(user)
    setNewPassword('')
    setConfirmPassword('')
    setDialogMode('password')
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
      toast({ title: 'Nome deve ter pelo menos 2 caracteres', variant: 'destructive' })
      return
    }
    if (formPassword.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' })
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
      toast({ title: 'Membro criado com sucesso', variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao criar membro'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!selectedUser || !formName.trim()) return
    if (formName.trim().length < 2) {
      toast({ title: 'Nome deve ter pelo menos 2 caracteres', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const res = await apiPatch<SingleResponse>(`users/${selectedUser.id}`, {
        name: formName.trim(),
        role: formRole,
      })
      setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? res.data : u)))
      toast({ title: 'Membro atualizado', variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao atualizar membro'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!selectedUser) return
    if (newPassword.length < 6) {
      toast({ title: 'Senha deve ter pelo menos 6 caracteres', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'As senhas nao coincidem', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      await apiPatch<SingleResponse>(`users/${selectedUser.id}/password`, {
        password: newPassword,
      })
      toast({ title: 'Senha alterada com sucesso', variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao alterar senha'
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
      toast({ title: 'Membro desativado', variant: 'success' })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao desativar membro'
      toast({ title: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  // ── Render ──

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-3xl">
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
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Equipe</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {users.length} {users.length === 1 ? 'membro' : 'membros'}
          </p>
        </div>
        <Button size="sm" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Novo Membro
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Users list */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado'}
          description={search ? 'Tente buscar com outros termos' : 'Adicione o primeiro membro da equipe'}
          action={!search ? { label: 'Adicionar membro', onClick: openCreateDialog } : undefined}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          {filteredUsers.map((member) => {
            const isSelf = member.id === currentUserId
            const isDeactivated = !!member.deletedAt
            const roleConfig = ROLE_CONFIG[member.role]

            return (
              <div
                key={member.id}
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
                      <Badge variant="secondary" className="text-[10px] shrink-0">Voce</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                </div>

                {/* Role badge */}
                <Badge variant={roleConfig.variant} className="text-[10px] shrink-0">
                  {roleConfig.label}
                </Badge>

                {/* Status badge */}
                {isDeactivated ? (
                  <Badge variant="destructive" className="text-[10px] shrink-0">Desativado</Badge>
                ) : (
                  <Badge variant="success" className="text-[10px] shrink-0">Ativo</Badge>
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
                    <TooltipContent>Editar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openPasswordDialog(member)}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Alterar senha</TooltipContent>
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
                      <TooltipContent>Reativar (em breve)</TooltipContent>
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
                        {isSelf ? 'Voce nao pode desativar a si mesmo' : 'Desativar'}
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
            <SheetTitle>Novo Membro</SheetTitle>
            <SheetDescription>
              Adicione um novo membro a equipe
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Nome</Label>
              <Input
                id="create-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome completo"
                minLength={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-password">Senha</Label>
              <Input
                id="create-password"
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Perfil</Label>
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
                    {ROLE_CONFIG[r].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={saving || !formName.trim() || !formEmail.trim() || !formPassword.trim()}
            >
              {saving ? 'Criando...' : 'Criar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Edit Member Sheet ── */}
      <Sheet open={dialogMode === 'edit'} onOpenChange={(open) => !open && closeDialog()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar Membro</SheetTitle>
            <SheetDescription>
              Altere as informacoes de {selectedUser?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome completo"
                minLength={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Perfil</Label>
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
                    {ROLE_CONFIG[r].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={saving || !formName.trim()}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Change Password Sheet ── */}
      <Sheet open={dialogMode === 'password'} onOpenChange={(open) => !open && closeDialog()}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Alterar Senha</SheetTitle>
            <SheetDescription>
              Defina uma nova senha para {selectedUser?.name}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                minLength={6}
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">As senhas nao coincidem</p>
              )}
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleChangePassword}
              disabled={saving || newPassword.length < 6 || newPassword !== confirmPassword}
            >
              {saving ? 'Salvando...' : 'Alterar senha'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Deactivate Confirmation Dialog ── */}
      <Dialog open={dialogMode === 'deactivate'} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desativar membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar{' '}
              <strong>{selectedUser?.name}</strong>? O membro perdera acesso ao sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeactivate} disabled={saving}>
              {saving ? 'Desativando...' : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
