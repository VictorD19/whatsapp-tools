import React from 'react'
import { Plus, UserCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { EmptyState } from '@/components/shared/empty-state'
import { getInitials } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Contatos' }

const mockContacts = [
  { id: '1', name: 'Ana Oliveira', phone: '+55 11 99999-0001', tags: ['Lead', 'VIP'], lastInteraction: 'Hoje' },
  { id: '2', name: 'Carlos Mendes', phone: '+55 11 99999-0002', tags: ['Cliente'], lastInteraction: 'Ontem' },
  { id: '3', name: 'Fernanda Costa', phone: '+55 11 99999-0003', tags: ['Prospect'], lastInteraction: 'há 3 dias' },
  { id: '4', name: 'Roberto Lima', phone: '+55 21 99999-0004', tags: ['Cliente', 'VIP'], lastInteraction: 'há 5 dias' },
  { id: '5', name: 'Juliana Santos', phone: '+55 11 99999-0005', tags: ['Lead'], lastInteraction: 'há 1 semana' },
]

export default function ContactsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {mockContacts.length} contatos cadastrados
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Novo contato
        </Button>
      </div>

      {mockContacts.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="Nenhum contato ainda"
          description="Importe contatos ou adicione manualmente para começar"
          action={{ label: 'Importar contatos', onClick: () => {} }}
        />
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Contato</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Tags</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Último contato</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockContacts.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary-500/10 text-primary-500 text-xs">
                          {getInitials(c.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{c.lastInteraction}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm">Ver</Button>
                      <Button variant="ghost" size="sm">Editar</Button>
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
