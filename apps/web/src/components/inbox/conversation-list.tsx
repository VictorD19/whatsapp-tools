'use client'

import React, { useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getInitials, formatDate, truncate } from '@/lib/utils'

interface Conversation {
  id: string
  contactName: string
  phone: string
  lastMessage: string
  lastMessageAt: string
  unreadCount: number
  isOnline: boolean
  instanceName: string
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    contactName: 'Ana Oliveira',
    phone: '+55 11 99999-0001',
    lastMessage: 'Olá! Gostaria de saber mais sobre o produto',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    unreadCount: 3,
    isOnline: true,
    instanceName: 'Vendas',
  },
  {
    id: '2',
    contactName: 'Carlos Mendes',
    phone: '+55 11 99999-0002',
    lastMessage: 'Obrigado pelo atendimento!',
    lastMessageAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    unreadCount: 0,
    isOnline: false,
    instanceName: 'Suporte',
  },
  {
    id: '3',
    contactName: 'Fernanda Costa',
    phone: '+55 11 99999-0003',
    lastMessage: 'Quando posso receber o pedido?',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 1,
    isOnline: true,
    instanceName: 'Vendas',
  },
  {
    id: '4',
    contactName: 'Roberto Lima',
    phone: '+55 21 99999-0004',
    lastMessage: 'Perfeito, até mais!',
    lastMessageAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    isOnline: false,
    instanceName: 'Suporte',
  },
  {
    id: '5',
    contactName: 'Juliana Santos',
    phone: '+55 11 99999-0005',
    lastMessage: 'Vocês têm parcelamento?',
    lastMessageAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    unreadCount: 2,
    isOnline: false,
    instanceName: 'Vendas',
  },
]

export function ConversationList() {
  const [search, setSearch] = useState('')
  const [activeId, setActiveId] = useState<string | null>(null)

  const filtered = mockConversations.filter(
    (c) =>
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.lastMessage.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversas</h2>
          <button className="text-muted-foreground hover:text-foreground">
            <Filter className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-7 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((conv) => (
          <button
            key={conv.id}
            onClick={() => setActiveId(conv.id)}
            className={cn(
              'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent',
              activeId === conv.id && 'bg-accent'
            )}
          >
            <div className="relative shrink-0">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary-500/10 text-primary-500 text-xs">
                  {getInitials(conv.contactName)}
                </AvatarFallback>
              </Avatar>
              {conv.isOnline && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background bg-green-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-semibold truncate">{conv.contactName}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">
                  {formatDate(conv.lastMessageAt)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1 mt-0.5">
                <span className="text-[11px] text-muted-foreground truncate">
                  {truncate(conv.lastMessage, 35)}
                </span>
                {conv.unreadCount > 0 && (
                  <Badge className="h-4 min-w-4 px-1 text-[10px] shrink-0">
                    {conv.unreadCount}
                  </Badge>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">{conv.instanceName}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
