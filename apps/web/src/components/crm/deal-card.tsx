import React from 'react'
import { Building2, Calendar, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Deal {
  id: string
  company: string
  contactName: string
  value: number
  closingDate: string
  agent: string
  tags: string[]
}

interface DealCardProps {
  deal: Deal
}

export function DealCard({ deal }: DealCardProps) {
  const formattedValue = deal.value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
  })

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow bg-background">
      <CardContent className="p-3 space-y-2">
        {/* Company + value */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-semibold truncate">{deal.company}</span>
          </div>
          <span className="text-xs font-bold text-primary-500 shrink-0">{formattedValue}</span>
        </div>

        {/* Contact */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{deal.contactName}</span>
        </div>

        {/* Date + agent */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(deal.closingDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
          </div>
          <span>{deal.agent}</span>
        </div>

        {/* Tags */}
        {deal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {deal.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
