'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Phone, ArrowLeft, Pencil, Check, X, Loader2, Calendar,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TagsSection } from '@/components/shared/tags-section'
import { DealDetailSheet } from '@/components/crm/deal-detail-sheet'
import { useContactDetail } from '@/hooks/use-contact-detail'
import { usePipelineStages } from '@/hooks/use-pipeline-stages'
import type { Deal } from '@/hooks/use-deal'
import { getInitials, formatPhone } from '@/lib/utils'
import { formatCurrency, formatDate } from '@/lib/formatting'

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params.id as string

  const { contact, deals, isLoadingContact, isLoadingDeals, updateContact } =
    useContactDetail(contactId)
  const { stages } = usePipelineStages()

  const [editingName, setEditingName] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [detailDeal, setDetailDeal] = useState<Deal | null>(null)

  if (isLoadingContact && !contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">Contato não encontrado</p>
      </div>
    )
  }

  const contactName = contact.name ?? (contact.phone.includes('@g.us') ? 'Grupo' : contact.phone)

  async function handleSaveName() {
    const name = nameInput.trim()
    if (!name) return
    await updateContact({ name })
    setEditingName(false)
  }

  function handleDealUpdated() {
    // invalidateQueries inside useDeal mutations handles refetch
  }

  const activeDeals = deals.filter((d) => d.stage.type === 'ACTIVE')
  const closedDeals = deals.filter((d) => d.stage.type === 'WON' || d.stage.type === 'LOST')

  return (
    <PageLayout
      breadcrumb={[{ label: 'Marketing' }, { label: 'Contatos' }]}
      cardClassName="flex flex-col overflow-hidden"
    >
      <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border px-6 py-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-12 w-12">
          <AvatarFallback className="bg-primary-500/10 text-primary-500 text-lg">
            {getInitials(contactName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="h-8 text-lg font-semibold"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName()
                  if (e.key === 'Escape') setEditingName(false)
                }}
                autoFocus
              />
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveName}>
                <Check className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingName(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(contact.name ?? ''); setEditingName(true) }}
              className="flex items-center gap-2 hover:text-muted-foreground transition-colors"
            >
              <h1 className="text-xl font-semibold truncate">{contactName}</h1>
              <Pencil className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </button>
          )}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
            <Phone className="h-3.5 w-3.5" />
            <span>{formatPhone(contact.phone)}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">
        {/* Tags */}
        <TagsSection contactId={contactId} />

        <Separator />

        {/* Active deals */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Negócios ativos</h2>
          {isLoadingDeals ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : activeDeals.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum negócio ativo</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {activeDeals.map((deal) => (
                <Card
                  key={deal.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setDetailDeal(deal)}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{deal.title || 'Sem título'}</span>
                      {deal.value != null && (
                        <span className="text-sm font-bold text-primary-500">{formatCurrency(deal.value)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: deal.stage.color }}
                      />
                      <span className="text-xs text-muted-foreground">{deal.stage.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{deal.pipeline.name}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(deal.createdAt)}</span>
                      {deal.assignedTo && (
                        <span className="ml-auto">{deal.assignedTo.name}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Closed deals */}
        {closedDeals.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h2 className="text-sm font-semibold">Negócios encerrados</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {closedDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="cursor-pointer hover:shadow-md transition-shadow opacity-70"
                    onClick={() => setDetailDeal(deal)}
                  >
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{deal.title || 'Sem título'}</span>
                        <Badge
                          variant="secondary"
                          className={
                            deal.stage.type === 'WON'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]'
                              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]'
                          }
                        >
                          {deal.stage.type === 'WON' ? 'Ganho' : 'Perdido'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {deal.value != null && <span>{formatCurrency(deal.value)}</span>}
                        <span className="ml-auto">{deal.pipeline.name}</span>
                      </div>
                      {deal.lostReason && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          Motivo: {deal.lostReason}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Deal detail sheet */}
      {detailDeal && (
        <DealDetailSheet
          open={!!detailDeal}
          onClose={() => setDetailDeal(null)}
          deal={detailDeal}
          stages={stages}
          onUpdated={handleDealUpdated}
          onDeleted={() => { setDetailDeal(null) }}
        />
      )}
    </div>
    </PageLayout>
  )
}
