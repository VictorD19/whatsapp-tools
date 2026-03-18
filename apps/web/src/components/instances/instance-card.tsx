'use client'

import React from 'react'
import { Settings2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { ImportProgressBar } from './import-progress'
import { formatPhone } from '@/lib/utils'
import { formatDate } from '@/lib/formatting'
import type { Instance, ImportProgress } from '@/stores/instances.store'

const statusMap = {
  CONNECTED: 'connected',
  CONNECTING: 'connecting',
  DISCONNECTED: 'disconnected',
  BANNED: 'failed',
} as const

interface InstanceCardProps {
  instance: Instance
  importProgress?: ImportProgress
  onConnect: (id: string) => void
  onDisconnect: (id: string) => void
  onEdit: (instance: Instance) => void
}

export function InstanceCard({
  instance,
  importProgress,
  onConnect,
  onDisconnect,
  onEdit,
}: InstanceCardProps) {
  const t = useTranslations('instances')
  const badgeStatus = statusMap[instance.status]

  return (
    <Card data-testid={`instance-card-${instance.id}`} className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{instance.name}</CardTitle>
            <CardDescription className="mt-0.5">
              {instance.phone ? formatPhone(instance.phone) : t('noNumber')}
            </CardDescription>
          </div>
          <StatusBadge status={badgeStatus} />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t('createdAt')}</span>
          <span className="font-medium">{formatDate(instance.createdAt)}</span>
        </div>
        <div className="flex gap-2 mt-4">
          {instance.status === 'CONNECTED' ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onDisconnect(instance.id)}
            >
              {t('disconnect')}
            </Button>
          ) : instance.status === 'DISCONNECTED' ? (
            <Button size="sm" className="flex-1" onClick={() => onConnect(instance.id)}>
              {t('connectQR')}
            </Button>
          ) : instance.status === 'CONNECTING' ? (
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onConnect(instance.id)}>
              {t('viewQR')}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1" disabled>
              {t('banned')}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(instance)}
            title={t('editSettings')}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
        {importProgress && <ImportProgressBar progress={importProgress} />}
      </CardContent>
    </Card>
  )
}
