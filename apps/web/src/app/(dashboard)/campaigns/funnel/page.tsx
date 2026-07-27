'use client'

import React from 'react'
import { Filter, MessageSquare, Handshake, CheckCircle2 } from 'lucide-react'
import { Funnel, FunnelChart, LabelList, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { PageLayout } from '@/components/layout/page-layout'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/shared/empty-state'
import { useSalesFunnel, type FunnelStageKey } from '@/hooks/use-sales-funnel'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/formatting'

const STAGE_ICONS: Record<FunnelStageKey, React.ElementType> = {
  started: MessageSquare,
  withDeal: Handshake,
  converted: CheckCircle2,
}

const STAGE_COLORS: Record<FunnelStageKey, string> = {
  started: 'hsl(var(--chart-1))',
  withDeal: 'hsl(var(--chart-3))',
  converted: 'hsl(var(--chart-5))',
}

export default function SalesFunnelPage() {
  const t = useTranslations('salesFunnel')
  const tCampaigns = useTranslations('campaigns')
  const tn = useTranslations('nav')

  React.useEffect(() => { document.title = 'Funil de Vendas | SistemaZapChat' }, [])

  const { stages, campaigns, initialLoading, fetching } = useSalesFunnel()

  const total = stages.find((s) => s.key === 'started')?.count ?? 0
  const hasData = total > 0

  const chartData = stages.map((stage) => ({
    key: stage.key,
    name: `${t(`stages.${stage.key}`)} — ${formatNumber(stage.count)}`,
    value: stage.count,
    fill: STAGE_COLORS[stage.key],
  }))

  return (
    <PageLayout
      breadcrumb={[
        { label: tn('groups.marketing') },
        { label: tn('items.campaigns'), href: '/campaigns' },
        { label: t('title') },
      ]}
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
      </div>

      {initialLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-lg" />
        </div>
      ) : !hasData ? (
        <EmptyState icon={Filter} title={t('empty')} description={t('emptyDescription')} />
      ) : (
        <div className={cn('space-y-8 transition-opacity duration-200', fetching && 'opacity-50 pointer-events-none')}>
          {/* Etapas + gráfico de funil */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
            {/* Lado esquerdo: detalhamento das etapas */}
            <div className="space-y-3">
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('stagesSection')}
              </h2>
              {stages.map((stage, i) => {
                const Icon = STAGE_ICONS[stage.key]
                const previous = i > 0 ? stages[i - 1].count : null
                const pctOfTotal = total > 0 ? Math.round((stage.count / total) * 100) : 0
                const pctOfPrevious = previous && previous > 0 ? Math.round((stage.count / previous) * 100) : null

                return (
                  <div key={stage.key} className="rounded-lg border border-border p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex h-7 w-7 items-center justify-center rounded-md shrink-0 bg-muted">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: STAGE_COLORS[stage.key] }}
                      />
                      <span className="font-medium text-foreground">{t(`stages.${stage.key}`)}</span>
                    </div>
                    <div className="text-2xl font-semibold text-foreground">{formatNumber(stage.count)}</div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{t('conversionFromStart', { percent: pctOfTotal })}</p>
                      {pctOfPrevious !== null && (
                        <p>{t('conversionFromPrevious', { percent: pctOfPrevious })}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Centro: gráfico de funil */}
            <div className="rounded-lg border border-border p-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={360}>
                <FunnelChart>
                  <Tooltip
                    formatter={(value: number) => [formatNumber(value), '']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  />
                  <Funnel dataKey="value" data={chartData} isAnimationActive>
                    <LabelList
                      position="right"
                      dataKey="name"
                      fill="hsl(var(--foreground))"
                      stroke="none"
                      fontSize={13}
                      fontWeight={500}
                    />
                    {chartData.map((entry) => (
                      <Cell key={entry.key} fill={entry.fill} />
                    ))}
                  </Funnel>
                </FunnelChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Abaixo: listagem de campanhas */}
          <div className="space-y-3">
            <div>
              <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('campaignsSection')}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t('campaignsSectionDescription')}</p>
            </div>

            <div className="rounded-md border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('table.name')}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('table.started')}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('table.withDeal')}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('table.converted')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaigns.map((campaign) => (
                    <tr key={campaign.adSourceId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <span className="font-medium">{campaign.adTitle || tCampaigns('untitled')}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tCampaigns('adId', { id: campaign.adSourceId })}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatNumber(campaign.started)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatNumber(campaign.withDeal)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatNumber(campaign.converted)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
