'use client'

import React from 'react'
import { Phone, Tag, Radio, User } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getInitials, formatPhone } from '@/lib/utils'
import type { Conversation } from '@/stores/inbox.store'

interface ContactPanelProps {
  conversation: Conversation | null
}

export function ContactPanel({ conversation }: ContactPanelProps) {
  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground p-4">
        Selecione uma conversa para ver os detalhes do contato
      </div>
    )
  }

  const contact = conversation.contact
  const contactName = contact.name ?? contact.phone

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Contact info */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-lg">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-sm font-semibold">{contactName}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <Phone className="h-3 w-3" />
            <span>{formatPhone(contact.phone)}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tags */}
      {conversation.tags.length > 0 && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              <span>Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {conversation.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Instance */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Radio className="h-3.5 w-3.5" />
          <span>Instancia</span>
        </div>
        <p className="text-xs text-foreground">{conversation.instance.name}</p>
      </div>

      <Separator />

      {/* Assigned to */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>Atendente</span>
        </div>
        <p className="text-xs text-foreground">
          {conversation.assignedTo?.name ?? 'Nenhum (pendente)'}
        </p>
      </div>

      {/* Status */}
      <Separator />
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground">Status</div>
        <Badge
          variant="secondary"
          className={
            conversation.status === 'OPEN'
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : conversation.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
          }
        >
          {conversation.status === 'OPEN'
            ? 'Aberta'
            : conversation.status === 'PENDING'
              ? 'Pendente'
              : 'Encerrada'}
        </Badge>
      </div>
    </div>
  )
}
