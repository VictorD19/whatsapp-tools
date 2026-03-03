import React from 'react'
import { Plus, Megaphone } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/shared/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Disparos' }

type CampaignStatus = 'running' | 'completed' | 'paused' | 'pending' | 'failed'

interface Campaign {
  id: string
  name: string
  status: CampaignStatus
  total: number
  sent: number
  failed: number
  instanceName: string
  createdAt: string
}

const statusVariantMap: Record<CampaignStatus, 'info' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  running: 'info',
  completed: 'success',
  paused: 'warning',
  pending: 'secondary',
  failed: 'destructive',
}

const statusLabelMap: Record<CampaignStatus, string> = {
  running: 'Em andamento',
  completed: 'Concluído',
  paused: 'Pausado',
  pending: 'Pendente',
  failed: 'Falhou',
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Black Friday — Promoção 70%',
    status: 'completed',
    total: 1500,
    sent: 1487,
    failed: 13,
    instanceName: 'Vendas Principal',
    createdAt: '2026-03-01',
  },
  {
    id: '2',
    name: 'Reativação clientes inativos',
    status: 'running',
    total: 800,
    sent: 342,
    failed: 5,
    instanceName: 'Marketing',
    createdAt: '2026-03-03',
  },
  {
    id: '3',
    name: 'Lançamento produto X',
    status: 'paused',
    total: 2000,
    sent: 650,
    failed: 8,
    instanceName: 'Vendas Principal',
    createdAt: '2026-03-02',
  },
  {
    id: '4',
    name: 'Pesquisa de satisfação',
    status: 'pending',
    total: 500,
    sent: 0,
    failed: 0,
    instanceName: 'Suporte',
    createdAt: '2026-03-03',
  },
]

export default function BroadcastsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Disparos em Massa</h1>
          <p className="text-sm text-muted-foreground mt-1">Crie e gerencie campanhas de mensagens</p>
        </div>
        <Link href="/broadcasts/new">
          <Button>
            <Plus className="h-4 w-4" />
            Nova campanha
          </Button>
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de campanhas', value: '4' },
          { label: 'Mensagens enviadas', value: '2.479' },
          { label: 'Taxa de entrega', value: '98,9%' },
          { label: 'Em andamento', value: '1' },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{s.label}</p>
              <p className="text-2xl font-bold mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {mockCampaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma campanha criada"
          description="Crie sua primeira campanha para começar a disparar mensagens em massa"
          action={{ label: 'Criar campanha', onClick: () => {} }}
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
                  Instância
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockCampaigns.map((c) => {
                const progress = c.total > 0 ? Math.round((c.sent / c.total) * 100) : 0
                const rate =
                  c.sent > 0 ? Math.round(((c.sent - c.failed) / c.sent) * 100) + '%' : '—'

                return (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.createdAt}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariantMap[c.status]}>{statusLabelMap[c.status]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 min-w-[120px]">
                        <div className="flex justify-between text-xs">
                          <span>{c.sent.toLocaleString()}/{c.total.toLocaleString()}</span>
                          <span>{progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{rate}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{c.instanceName}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm">Detalhes</Button>
                        {c.status === 'running' && (
                          <Button variant="outline" size="sm">Pausar</Button>
                        )}
                        {c.status === 'paused' && (
                          <Button size="sm">Retomar</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
