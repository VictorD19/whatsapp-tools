import React from 'react'
import { Plus, Bot, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Assistentes IA' }

const mockAssistants = [
  {
    id: '1',
    name: 'SDR — Qualificação de Leads',
    type: 'sdr',
    status: 'active',
    instanceName: 'Vendas Principal',
    conversationsToday: 23,
    model: 'Claude Sonnet 4.6',
  },
  {
    id: '2',
    name: 'Suporte Técnico Básico',
    type: 'support',
    status: 'active',
    instanceName: 'Suporte',
    conversationsToday: 15,
    model: 'Claude Haiku 4.5',
  },
  {
    id: '3',
    name: 'Agendamento de Reuniões',
    type: 'scheduling',
    status: 'inactive',
    instanceName: '—',
    conversationsToday: 0,
    model: 'Claude Sonnet 4.6',
  },
]

export default function AssistantsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Assistentes Virtuais</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure IAs para atendimento, SDR e agendamento automático
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Novo assistente
        </Button>
      </div>

      {mockAssistants.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Nenhum assistente configurado"
          description="Crie um assistente de IA para automatizar o atendimento via WhatsApp"
          action={{ label: 'Criar assistente', onClick: () => {} }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {mockAssistants.map((a) => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500/10">
                      <Bot className="h-5 w-5 text-primary-500" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">{a.name}</CardTitle>
                      <CardDescription className="text-xs mt-0.5">{a.model}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={a.status === 'active' ? 'success' : 'secondary'}>
                    {a.status === 'active' ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Conversas hoje</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <Zap className="h-3.5 w-3.5 text-primary-500" />
                    {a.conversationsToday}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Instância</span>
                  <span className="font-medium">{a.instanceName}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1">Configurar</Button>
                  <Button variant="ghost" size="sm">
                    {a.status === 'active' ? 'Pausar' : 'Ativar'}
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
