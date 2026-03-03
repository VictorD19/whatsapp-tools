import React from 'react'
import { Phone, Tag, StickyNote, Clock } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'

export function ContactPanel() {
  const contact = {
    name: 'Ana Oliveira',
    phone: '+55 11 99999-0001',
    tags: ['Lead', 'VIP'],
    notes: 'Interessada no plano empresarial. Já solicitou demonstração.',
    lastInteractions: [
      { date: 'Hoje, 14:30', text: 'Perguntou sobre pagamento' },
      { date: 'Ontem, 10:00', text: 'Primeiro contato' },
    ],
  }

  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Contact info */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-lg">
            {getInitials(contact.name)}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h3 className="text-sm font-semibold">{contact.name}</h3>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
            <Phone className="h-3 w-3" />
            <span>{contact.phone}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Tags */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" />
          <span>Tags</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          <button className="text-xs text-primary-500 hover:underline">+ adicionar</button>
        </div>
      </div>

      <Separator />

      {/* Notes */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <StickyNote className="h-3.5 w-3.5" />
          <span>Notas internas</span>
        </div>
        <p className="text-xs text-foreground leading-relaxed">{contact.notes}</p>
      </div>

      <Separator />

      {/* History */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Histórico</span>
        </div>
        <div className="space-y-2">
          {contact.lastInteractions.map((item, i) => (
            <div key={i} className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground">{item.date}</p>
              <p className="text-xs text-foreground">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
