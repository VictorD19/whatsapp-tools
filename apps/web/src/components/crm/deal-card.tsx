'use client'

import React from 'react'
import { Calendar, User, DollarSign } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Deal } from '@/hooks/use-deal'
import { formatCurrencyCompact, formatDateShort } from '@/lib/formatting'

interface DealCardProps {
  deal: Deal
  onDealClick?: (deal: Deal) => void
}

export const DealCard = React.forwardRef<HTMLDivElement, DealCardProps & Omit<React.HTMLAttributes<HTMLDivElement>, 'onClick'>>(
  ({ deal, onDealClick, ...props }, ref) => {
    const contactName = deal.contact.name ?? deal.contact.phone
    const formattedValue = deal.value != null
      ? formatCurrencyCompact(Number(deal.value))
      : null

    return (
      <div ref={ref} data-testid={`deal-card-${deal.id}`} {...props} onClick={() => onDealClick?.(deal)}>
        <Card className="cursor-pointer hover:shadow-md transition-shadow bg-background">
          <CardContent className="p-3 space-y-2">
            {/* Title or contact name + value */}
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold truncate min-w-0">
                {deal.title || contactName}
              </span>
              {formattedValue && (
                <span className="text-xs font-bold text-primary-500 shrink-0 flex items-center gap-0.5">
                  <DollarSign className="h-3 w-3" />
                  {formattedValue}
                </span>
              )}
            </div>

            {/* Contact name if title exists */}
            {deal.title && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="h-3 w-3 shrink-0" />
                <span className="truncate">{contactName}</span>
              </div>
            )}

            {/* Date + agent */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>
                  {formatDateShort(deal.createdAt)}
                </span>
              </div>
              {deal.assignedTo && <span>{deal.assignedTo.name}</span>}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
)

DealCard.displayName = 'DealCard'
