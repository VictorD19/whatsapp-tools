'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Radio } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import { InstanceGrid } from '@/components/instances/instance-grid'
import { CreateInstanceModal } from '@/components/instances/create-instance-modal'
import { QrCodeModal } from '@/components/instances/qr-code-modal'
import { InstanceSettingsSheet } from '@/components/instances/instance-settings-sheet'
import { useInstances } from '@/hooks/use-instances'
import { useInstanceSocket } from '@/hooks/use-instance-socket'
import { useImportSocket } from '@/hooks/use-import-socket'
import { useInstancesStore } from '@/stores/instances.store'
import { apiGet } from '@/lib/api'
import type { Instance } from '@/stores/instances.store'

export default function InstancesPage() {
  const t = useTranslations('instances')
  const tn = useTranslations('nav')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])

  const instances = useInstancesStore((s) => s.instances)
  const isLoading = useInstancesStore((s) => s.isLoading)
  const importProgress = useInstancesStore((s) => s.importProgress)
  const { fetchInstances, refreshInstances, createInstance, connectInstance, disconnectInstance, deleteInstance, updateInstance, importConversations } =
    useInstances()

  const [createOpen, setCreateOpen] = useState(false)
  const [qrOpen, setQrOpen] = useState(false)
  const [qrInstanceId, setQrInstanceId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null)
  const [assistants, setAssistants] = useState<{ id: string; name: string; isActive: boolean }[]>([])

  // Socket for real-time updates
  useInstanceSocket()
  useImportSocket()

  // Initial fetch
  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  useEffect(() => {
    apiGet<{ data: { id: string; name: string; isActive: boolean }[] }>('assistants')
      .then((res) => setAssistants(res.data))
      .catch(() => {})
  }, [])

  // Fallback polling: when any instance is CONNECTING, poll every 3s
  // This handles WebSocket failures and ensures the page reflects the real status
  const connectingCount = useMemo(
    () => instances.filter((i) => i.status === 'CONNECTING').length,
    [instances],
  )
  useEffect(() => {
    if (connectingCount === 0) return
    const interval = setInterval(refreshInstances, 3_000)
    return () => clearInterval(interval)
  }, [connectingCount, refreshInstances])

  const handleEdit = useCallback(
    (instance: Instance) => {
      setEditingInstance(instance)
      setSettingsOpen(true)
    },
    [],
  )

  const handleConnect = useCallback(
    (id: string) => {
      setQrInstanceId(id)
      setQrOpen(true)
    },
    [],
  )

  const handleRequestQr = useCallback(
    async (id: string) => {
      return connectInstance(id)
    },
    [connectInstance],
  )

  // When QR modal closes, do a fresh fetch to ensure the page reflects
  // the current status (covers cases where WebSocket events were missed)
  const handleQrOpenChange = useCallback(
    (open: boolean) => {
      setQrOpen(open)
      if (!open) {
        fetchInstances()
      }
    },
    [fetchInstances],
  )

  // Stats
  const stats = {
    total: instances.length,
    connected: instances.filter((i) => i.status === 'CONNECTED').length,
    connecting: instances.filter((i) => i.status === 'CONNECTING').length,
    disconnected: instances.filter((i) => i.status === 'DISCONNECTED').length,
  }

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.settings') }, { label: tn('items.instances') }]}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          {t('newInstance')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('stats.total'), value: stats.total, color: 'text-foreground' },
          { label: t('stats.connected'), value: stats.connected, color: 'text-green-600 dark:text-green-400' },
          { label: t('stats.connecting'), value: stats.connecting, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: t('stats.disconnected'), value: stats.disconnected, color: 'text-red-600 dark:text-red-400' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instances grid */}
      {!isLoading && instances.length === 0 ? (
        <EmptyState
          icon={Radio}
          title={t('empty.title')}
          description={t('empty.description')}
          action={{ label: t('empty.action'), onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <InstanceGrid
          instances={instances}
          isLoading={isLoading}
          importProgress={importProgress}
          onConnect={handleConnect}
          onDisconnect={disconnectInstance}
          onEdit={handleEdit}
        />
      )}

      {/* Modals */}
      <CreateInstanceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={createInstance}
      />
      <QrCodeModal
        open={qrOpen}
        onOpenChange={handleQrOpenChange}
        instanceId={qrInstanceId}
        onRequestQr={handleRequestQr}
      />
      <InstanceSettingsSheet
        instance={editingInstance}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onUpdate={updateInstance}
        onSync={importConversations}
        onDelete={deleteInstance}
        assistants={assistants}
      />
    </PageLayout>
  )
}
