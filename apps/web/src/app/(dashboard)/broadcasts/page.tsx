'use client'

import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Megaphone,
  Pause,
  Play,
  XCircle,
  Trash2,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { BroadcastWizardDialog } from '@/components/broadcasts/broadcast-wizard-dialog'
import type { BroadcastWizardData, BroadcastEditData } from '@/components/broadcasts/broadcast-wizard-dialog'
import { useBroadcasts, type BroadcastStatus } from '@/hooks/use-broadcasts'
import { useBroadcastSocket } from '@/hooks/use-broadcast-socket'
import { useInstances } from '@/hooks/use-instances'
import { useContactLists } from '@/hooks/use-contact-lists'
import { useInstancesStore } from '@/stores/instances.store'
import { formatDate, formatDateTime, formatNumber } from '@/lib/formatting'

const statusVariantMap: Record<BroadcastStatus, 'info' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'secondary',
  RUNNING: 'info',
  PAUSED: 'warning',
  COMPLETED: 'success',
  FAILED: 'destructive',
  CANCELLED: 'secondary',
}

const statusLabelMap: Record<BroadcastStatus, string> = {
  DRAFT: 'Rascunho',
  SCHEDULED: 'Agendada',
  RUNNING: 'Em andamento',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluida',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
}

export default function BroadcastsPage() {
  React.useEffect(() => { document.title = 'Disparos em Massa | SistemaZapChat' }, [])

  const {
    broadcasts,
    initialLoading,
    meta,
    fetchBroadcasts,
    fetchBroadcast,
    createBroadcast,
    updateBroadcast,
    pauseBroadcast,
    resumeBroadcast,
    cancelBroadcast,
    deleteBroadcast,
    updateBroadcastProgress,
    updateBroadcastStatus,
  } = useBroadcasts()

  const { fetchInstances } = useInstances()
  const instances = useInstancesStore((s) => s.instances)
  const { lists: contactLists } = useContactLists()

  const [wizardOpen, setWizardOpen] = useState(false)
  const [editData, setEditData] = useState<BroadcastEditData | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Socket for real-time updates
  const onProgress = useCallback(
    (broadcastId: string, sent: number, failed: number) => {
      updateBroadcastProgress(broadcastId, sent, failed)
    },
    [updateBroadcastProgress],
  )

  const onStatusChange = useCallback(
    (broadcastId: string, status: string) => {
      updateBroadcastStatus(broadcastId, status as BroadcastStatus)
    },
    [updateBroadcastStatus],
  )

  useBroadcastSocket({ onProgress, onStatusChange })

  useEffect(() => {
    fetchBroadcasts()
    fetchInstances()
  }, [fetchBroadcasts, fetchInstances])

  const handleCreateBroadcast = async (data: BroadcastWizardData) => {
    if (editData) {
      await updateBroadcast(editData.id, data)
    } else {
      await createBroadcast(data)
    }
    fetchBroadcasts()
  }

  const handleEdit = async (broadcastId: string) => {
    try {
      const full = await fetchBroadcast(broadcastId)
      // Convert scheduledAt to local datetime-local format
      let localScheduledAt: string | undefined
      if (full.scheduledAt) {
        const d = new Date(full.scheduledAt)
        const offset = d.getTimezoneOffset()
        const local = new Date(d.getTime() - offset * 60 * 1000)
        localScheduledAt = local.toISOString().slice(0, 16)
      }

      setEditData({
        id: full.id,
        name: full.name,
        instanceIds: full.instances.map((bi: any) => bi.instance.id),
        contactListIds: (full as any).sources
          ?.filter((s: any) => s.sourceType === 'CONTACT_LIST' && s.contactListId)
          .map((s: any) => s.contactListId) ?? [],
        variations: (full.variations ?? []).map((v: any) => ({
          messageType: v.messageType,
          text: v.text ?? '',
          file: null,
          existingMediaUrl: v.mediaUrl ?? undefined,
          existingFileName: v.fileName ?? undefined,
        })),
        delay: full.delay,
        scheduledAt: localScheduledAt,
      })
      setWizardOpen(true)
    } catch {
      // Error handled by fetchBroadcast
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteBroadcast(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  // Stats
  const totalCampaigns = meta.total
  const totalSent = broadcasts.reduce((sum, b) => sum + b.sentCount, 0)
  const totalFailed = broadcasts.reduce((sum, b) => sum + b.failedCount, 0)
  const deliveryRate = totalSent > 0 ? Math.round(((totalSent - totalFailed) / totalSent) * 100) : 0
  const runningCount = broadcasts.filter((b) => b.status === 'RUNNING').length

  return (
    <PageLayout breadcrumb={[{ label: 'Marketing' }, { label: 'Disparos' }]}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Disparos em Massa</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie e gerencie campanhas de mensagens
          </p>
        </div>
        <Button onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova campanha
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de campanhas', value: formatNumber(totalCampaigns) },
          { label: 'Mensagens enviadas', value: formatNumber(totalSent) },
          { label: 'Taxa de entrega', value: totalSent > 0 ? `${deliveryRate}%` : '--' },
          { label: 'Em andamento', value: formatNumber(runningCount) },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        </div>
      ) : broadcasts.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma campanha criada"
          description="Crie sua primeira campanha para comecar a disparar mensagens em massa"
          action={{ label: 'Criar campanha', onClick: () => setWizardOpen(true) }}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Campanha
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Progresso
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Taxa
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Instancias
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {broadcasts.map((b) => {
                const progress =
                  b.totalCount > 0
                    ? Math.round(((b.sentCount + b.failedCount) / b.totalCount) * 100)
                    : 0
                const rate =
                  b.sentCount > 0
                    ? Math.round(((b.sentCount - b.failedCount) / b.sentCount) * 100) + '%'
                    : '--'

                return (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{b.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {b.scheduledAt
                            ? `Agendada: ${formatDateTime(b.scheduledAt)}`
                            : formatDate(b.createdAt)}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariantMap[b.status]}>
                        {statusLabelMap[b.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span>
                            {formatNumber(b.sentCount)}/{formatNumber(b.totalCount)}
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              b.status === 'RUNNING'
                                ? 'bg-primary-500 animate-pulse'
                                : b.status === 'FAILED'
                                  ? 'bg-destructive'
                                  : 'bg-primary-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{rate}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {b.instances.map((bi) => bi.instance.name).join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {['DRAFT', 'SCHEDULED'].includes(b.status) && (
                              <DropdownMenuItem onClick={() => handleEdit(b.id)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {b.status === 'RUNNING' && (
                              <DropdownMenuItem onClick={() => pauseBroadcast(b.id)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pausar
                              </DropdownMenuItem>
                            )}
                            {b.status === 'PAUSED' && (
                              <DropdownMenuItem onClick={() => resumeBroadcast(b.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Retomar
                              </DropdownMenuItem>
                            )}
                            {['RUNNING', 'PAUSED', 'SCHEDULED'].includes(b.status) && (
                              <DropdownMenuItem onClick={() => cancelBroadcast(b.id)}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            )}
                            {!['RUNNING', 'COMPLETED'].includes(b.status) && (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(b.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((page) => (
            <Button
              key={page}
              variant={page === meta.page ? 'default' : 'outline'}
              size="sm"
              onClick={() => fetchBroadcasts(undefined, page)}
            >
              {page}
            </Button>
          ))}
        </div>
      )}

      {/* Wizard Dialog */}
      <BroadcastWizardDialog
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setEditData(null)
        }}
        instances={instances}
        contactLists={contactLists}
        onSubmit={handleCreateBroadcast}
        editData={editData}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusao</DialogTitle>
            <DialogDescription>
              Esta acao nao pode ser desfeita. A campanha e todos os seus dados serao removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
