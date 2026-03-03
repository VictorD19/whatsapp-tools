import React from 'react'
import { Plus, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Instâncias' }

const mockInstances = [
  {
    id: '1',
    name: 'Vendas Principal',
    phone: '+55 (11) 99999-0001',
    status: 'connected' as const,
    messagesDay: 142,
    lastActivity: '2 min atrás',
  },
  {
    id: '2',
    name: 'Suporte',
    phone: '+55 (11) 99999-0002',
    status: 'connected' as const,
    messagesDay: 87,
    lastActivity: '5 min atrás',
  },
  {
    id: '3',
    name: 'Marketing',
    phone: '+55 (11) 99999-0003',
    status: 'connecting' as const,
    messagesDay: 0,
    lastActivity: '—',
  },
  {
    id: '4',
    name: 'Pós-venda',
    phone: '+55 (11) 99999-0004',
    status: 'disconnected' as const,
    messagesDay: 0,
    lastActivity: 'há 2 dias',
  },
]

export default function InstancesPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Instâncias WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie suas conexões com o WhatsApp
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Nova instância
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: '4', color: 'text-foreground' },
          { label: 'Conectadas', value: '2', color: 'text-green-600 dark:text-green-400' },
          { label: 'Conectando', value: '1', color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'Desconectadas', value: '1', color: 'text-red-600 dark:text-red-400' },
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
      {mockInstances.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="Nenhuma instância criada"
          description="Conecte seu WhatsApp para começar a enviar e receber mensagens"
          action={{ label: 'Criar primeira instância', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockInstances.map((instance) => (
            <Card key={instance.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{instance.name}</CardTitle>
                    <CardDescription className="mt-0.5">{instance.phone}</CardDescription>
                  </div>
                  <StatusBadge status={instance.status} />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Mensagens hoje</span>
                  <span className="font-medium">{instance.messagesDay}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Última atividade</span>
                  <span className="font-medium">{instance.lastActivity}</span>
                </div>
                <div className="flex gap-2 mt-4">
                  {instance.status === 'connected' ? (
                    <Button variant="outline" size="sm" className="flex-1">
                      Desconectar
                    </Button>
                  ) : instance.status === 'disconnected' ? (
                    <Button size="sm" className="flex-1">
                      Conectar QR
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="flex-1" disabled>
                      Aguardando...
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
