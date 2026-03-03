import React from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Grupos' }

const mockGroups = [
  { id: '1', name: 'Clientes VIP', members: 128, instanceName: 'Vendas Principal', lastActivity: 'Hoje' },
  { id: '2', name: 'Promoções e Novidades', members: 543, instanceName: 'Marketing', lastActivity: 'Ontem' },
  { id: '3', name: 'Suporte Técnico', members: 87, instanceName: 'Suporte', lastActivity: 'há 2 dias' },
  { id: '4', name: 'Parceiros', members: 34, instanceName: 'Vendas Principal', lastActivity: 'há 3 dias' },
]

export default function GroupsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Grupos WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie grupos e membros para disparos segmentados
          </p>
        </div>
        <Button variant="outline">Sincronizar grupos</Button>
      </div>

      {mockGroups.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum grupo encontrado"
          description="Sincronize seus grupos do WhatsApp para começar"
          action={{ label: 'Sincronizar agora', onClick: () => {} }}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Grupo
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Membros
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Instância
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Última atividade
                </th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockGroups.map((group) => (
                <tr key={group.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium">{group.name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary">{group.members} membros</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{group.instanceName}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{group.lastActivity}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">Ver membros</Button>
                      <Button size="sm">Disparar menção</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
