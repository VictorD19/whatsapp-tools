'use client'

import React from 'react'
import { DealCard } from './deal-card'
import { cn } from '@/lib/utils'

interface Deal {
  id: string
  company: string
  contactName: string
  value: number
  closingDate: string
  agent: string
  tags: string[]
}

interface Column {
  id: string
  title: string
  color: string
  deals: Deal[]
}

const mockColumns: Column[] = [
  {
    id: 'new',
    title: 'Novo',
    color: 'bg-slate-400',
    deals: [
      {
        id: '1',
        company: 'Tech Solutions Ltda',
        contactName: 'Ana Oliveira',
        value: 5000,
        closingDate: '2026-03-30',
        agent: 'João S.',
        tags: ['WhatsApp'],
      },
      {
        id: '2',
        company: 'Comércio ABC',
        contactName: 'Carlos Mendes',
        value: 1200,
        closingDate: '2026-04-15',
        agent: 'Maria L.',
        tags: ['Inbound'],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Em contato',
    color: 'bg-blue-400',
    deals: [
      {
        id: '3',
        company: 'Design Studio',
        contactName: 'Fernanda Costa',
        value: 8500,
        closingDate: '2026-03-25',
        agent: 'João S.',
        tags: ['VIP'],
      },
    ],
  },
  {
    id: 'demo',
    title: 'Demo',
    color: 'bg-purple-400',
    deals: [
      {
        id: '4',
        company: 'Mega Distribuidora',
        contactName: 'Roberto Lima',
        value: 25000,
        closingDate: '2026-03-20',
        agent: 'Maria L.',
        tags: ['Enterprise', 'VIP'],
      },
    ],
  },
  {
    id: 'negotiation',
    title: 'Negociação',
    color: 'bg-yellow-400',
    deals: [
      {
        id: '5',
        company: 'StartupX',
        contactName: 'Juliana Santos',
        value: 3200,
        closingDate: '2026-03-18',
        agent: 'Pedro M.',
        tags: ['Startup'],
      },
    ],
  },
  {
    id: 'won',
    title: 'Ganho',
    color: 'bg-green-400',
    deals: [
      {
        id: '6',
        company: 'Grupo Empresarial',
        contactName: 'Marcelo R.',
        value: 15000,
        closingDate: '2026-03-01',
        agent: 'João S.',
        tags: ['Renovação'],
      },
    ],
  },
  {
    id: 'lost',
    title: 'Perdido',
    color: 'bg-red-400',
    deals: [],
  },
]

export function KanbanBoard() {
  const totalValue = mockColumns
    .filter((c) => c.id !== 'lost')
    .flatMap((c) => c.deals)
    .reduce((acc, d) => acc + d.value, 0)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Pipeline total:{' '}
        <span className="font-semibold text-foreground">
          {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      </p>
      <div className="flex gap-4 min-w-max">
        {mockColumns.map((column) => (
          <div key={column.id} className="flex flex-col gap-3 w-[260px] shrink-0">
            {/* Column header */}
            <div className="flex items-center gap-2">
              <div className={cn('h-2.5 w-2.5 rounded-full', column.color)} />
              <span className="text-sm font-medium">{column.title}</span>
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-xs text-muted-foreground">
                {column.deals.length}
              </span>
            </div>

            {/* Drop zone */}
            <div className="flex flex-col gap-2 min-h-[200px] rounded-lg bg-muted/40 p-2">
              {column.deals.map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
              {column.deals.length === 0 && (
                <div className="flex flex-1 items-center justify-center py-8">
                  <p className="text-xs text-muted-foreground/60">Sem negócios</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
