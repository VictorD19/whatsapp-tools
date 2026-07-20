'use client'

import React from 'react'
import { TrendingUp, MessageSquare, CheckCircle2 } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useCampaigns } from '@/hooks/use-campaigns'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { formatDate, formatCurrency } from '@/lib/formatting'

export default function CampaignsPage() {
  const t = useTranslations('campaigns')
  const tn = useTranslations('nav')

  React.useEffect(() => { document.title = 'Campanhas | SistemaZapChat' }, [])

  const { campaigns, initialLoading, fetching } = useCampaigns()

  return (
    <PageLayout breadcrumb={[{ label: tn('groups.marketing') }, { label: tn('items.campaigns') }]}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {campaigns.length === 1
            ? t('subtitle', { count: campaigns.length })
            : t('subtitlePlural', { count: campaigns.length })}
        </p>
      </div>

      {/* Table */}
      {initialLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title={t('empty')}
          description={t('emptyDescription')}
        />
      ) : (
        <div className={cn('rounded-md border border-border overflow-hidden transition-opacity duration-200', fetching && 'opacity-50 pointer-events-none')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('table.name')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('table.conversations')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('table.converted')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('table.value')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('table.firstConversation')}
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('table.lastConversation')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border animate-fade-slide-in">
              {campaigns.map((campaign) => (
                <tr key={campaign.adSourceId} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium">
                        {campaign.adTitle || t('untitled')}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('adId', { id: campaign.adSourceId })}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>{campaign.conversationCount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{campaign.convertedCount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {campaign.totalValue > 0 ? formatCurrency(campaign.totalValue) : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(campaign.firstConversationAt)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {formatDate(campaign.lastConversationAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  )
}
