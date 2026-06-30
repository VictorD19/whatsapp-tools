'use client'

import React, { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle, ChevronDown, ScrollText } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { apiGet } from '@/lib/api'
import { formatDateTime } from '@/lib/formatting'
import { cn } from '@/lib/utils'

type ApiLogType = 'LLM_CHAT' | 'EMBEDDING' | 'TOOL_EXECUTION' | 'TTS' | 'STT'
type ApiLogStatus = 'SUCCESS' | 'ERROR'

interface ApiLog {
  id: string
  type: ApiLogType
  status: ApiLogStatus
  conversationId?: string
  assistantId?: string
  model?: string
  inputTokens?: number
  outputTokens?: number
  toolType?: string
  toolName?: string
  inputSummary?: string
  outputSummary?: string
  errorMessage?: string
  durationMs?: number
  createdAt: string
}

interface ApiLogsResponse {
  items: ApiLog[]
  total: number
  page: number
  limit: number
}

const TYPE_COLORS: Record<ApiLogType, string> = {
  LLM_CHAT: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
  EMBEDDING: 'bg-purple-500/15 text-purple-700 dark:text-purple-400',
  TOOL_EXECUTION: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  TTS: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  STT: 'bg-teal-500/15 text-teal-700 dark:text-teal-400',
}

const ALL_TYPES: ApiLogType[] = ['LLM_CHAT', 'EMBEDDING', 'TOOL_EXECUTION', 'TTS', 'STT']

export default function ApiLogsPage() {
  const t = useTranslations('apiLogs')
  const tNav = useTranslations('nav')

  React.useEffect(() => {
    document.title = `${t('title')} | SistemaZapChat`
  }, [t])

  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<ApiLogType | null>(null)
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null)
  const LIMIT = 50

  const { data, isLoading } = useQuery<ApiLogsResponse>({
    queryKey: ['api-logs', page, typeFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (typeFilter) params.set('type', typeFilter)
      return apiGet<ApiLogsResponse>(`api-logs?${params.toString()}`)
    },
  })

  const items = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))
  const startIdx = total === 0 ? 0 : (page - 1) * LIMIT + 1
  const endIdx = Math.min(page * LIMIT, total)

  return (
    <PageLayout
      breadcrumb={[{ label: tNav('groups.ai') }, { label: t('breadcrumb') }]}
      cardClassName="flex flex-col overflow-hidden p-0"
    >
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              {typeFilter ? t(`filter.${typeFilter}`) : t('filter.all')}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => { setTypeFilter(null); setPage(1) }}>
              {t('filter.all')}
            </DropdownMenuItem>
            {ALL_TYPES.map((type) => (
              <DropdownMenuItem key={type} onClick={() => { setTypeFilter(type); setPage(1) }}>
                {t(`filter.${type}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex-1" />
        {!isLoading && (
          <span className="text-xs text-muted-foreground">
            {total} {t('table.noModel') === '—' ? 'registros' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto min-h-0 px-5 py-4 flex flex-col">
        {isLoading ? (
          <div className="space-y-px">
            <div className="flex items-center gap-4 px-4 py-3 border border-border rounded-t-md bg-muted/30">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-24" />
              ))}
            </div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-4 py-3.5 border-x border-b border-border last:rounded-b-md"
              >
                {Array.from({ length: 5 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 w-20" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="border border-border rounded-md overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[140px_90px_160px_120px_110px_1fr] items-center px-4 py-2.5 border-b border-border bg-muted/20">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.type')}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.status')}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.model')}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.tokens')}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.duration')}</span>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('table.date')}</span>
              </div>

              {/* Rows */}
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <ScrollText className="h-10 w-10 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">{t('empty')}</p>
                  <p className="text-xs text-muted-foreground/60 max-w-xs text-center">{t('emptyHint')}</p>
                </div>
              ) : (
                items.map((log) => (
                  <div
                    key={log.id}
                    className="grid grid-cols-[140px_90px_160px_120px_110px_1fr] items-center px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    {/* Type badge */}
                    <span className={cn('inline-flex w-fit items-center rounded-md px-2 py-0.5 text-xs font-medium', TYPE_COLORS[log.type])}>
                      {t(`type.${log.type}`)}
                    </span>

                    {/* Status */}
                    <span className="flex items-center gap-1.5">
                      {log.status === 'SUCCESS' ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <span className={cn('text-xs', log.status === 'SUCCESS' ? 'text-green-600 dark:text-green-400' : 'text-destructive')}>
                        {t(`status.${log.status}`)}
                      </span>
                    </span>

                    {/* Model */}
                    <span className="text-xs text-muted-foreground truncate pr-2">
                      {log.model ?? (log.toolName ?? t('table.noModel'))}
                    </span>

                    {/* Tokens */}
                    <span className="text-xs text-muted-foreground">
                      {log.inputTokens != null || log.outputTokens != null
                        ? `${log.inputTokens ?? 0}↑ ${log.outputTokens ?? 0}↓`
                        : t('table.noModel')}
                    </span>

                    {/* Duration */}
                    <span className="text-xs text-muted-foreground">
                      {log.durationMs != null ? `${log.durationMs}ms` : t('table.noModel')}
                    </span>

                    {/* Date */}
                    <span className="text-xs text-muted-foreground truncate">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {items.length > 0 && page === totalPages && (
              <div className="flex items-center justify-center gap-2 mt-auto pt-6 pb-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t('table.endOfList')}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-border text-xs text-muted-foreground shrink-0 mt-auto">
        {!isLoading && total > 0 ? (
          <>
            <span>{t('table.showing', { start: startIdx, end: endIdx, total })}</span>
            <div className="flex items-center gap-1">
              <span className="mr-2">{t('table.pageInfo', { current: page, total: totalPages })}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 1} onClick={() => setPage(1)}>{'«'}</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>{'‹'}</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>{'›'}</Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" disabled={page === totalPages} onClick={() => setPage(totalPages)}>{'»'}</Button>
            </div>
          </>
        ) : (
          <span className="invisible">–</span>
        )}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(v) => !v && setSelectedLog(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('detail.title')}</SheetTitle>
            <SheetDescription>
              {selectedLog ? formatDateTime(selectedLog.createdAt) : ''}
            </SheetDescription>
          </SheetHeader>
          {selectedLog && (
            <div className="space-y-4 py-4 text-sm">
              <DetailRow label={t('table.type')}>
                <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', TYPE_COLORS[selectedLog.type])}>
                  {t(`type.${selectedLog.type}`)}
                </span>
              </DetailRow>
              <DetailRow label={t('table.status')}>
                <span className={cn('text-xs font-medium', selectedLog.status === 'SUCCESS' ? 'text-green-600' : 'text-destructive')}>
                  {t(`status.${selectedLog.status}`)}
                </span>
              </DetailRow>
              {selectedLog.model && <DetailRow label={t('table.model')}>{selectedLog.model}</DetailRow>}
              {(selectedLog.inputTokens != null || selectedLog.outputTokens != null) && (
                <DetailRow label={t('table.tokens')}>
                  {selectedLog.inputTokens ?? 0}↑ {selectedLog.outputTokens ?? 0}↓
                </DetailRow>
              )}
              {selectedLog.toolName && <DetailRow label={t('table.tool')}>{selectedLog.toolName} ({selectedLog.toolType})</DetailRow>}
              {selectedLog.durationMs != null && <DetailRow label={t('table.duration')}>{selectedLog.durationMs}ms</DetailRow>}
              {selectedLog.conversationId && (
                <DetailRow label={t('detail.conversationId')}>
                  <span className="font-mono text-xs">{selectedLog.conversationId}</span>
                </DetailRow>
              )}
              {selectedLog.inputSummary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('table.input')}</p>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                    {selectedLog.inputSummary}
                  </pre>
                </div>
              )}
              {selectedLog.outputSummary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{t('table.output')}</p>
                  <pre className="text-xs bg-muted rounded-md p-3 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                    {selectedLog.outputSummary}
                  </pre>
                </div>
              )}
              {selectedLog.errorMessage && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">{t('detail.errorMessage')}</p>
                  <pre className="text-xs bg-destructive/10 text-destructive rounded-md p-3 whitespace-pre-wrap break-words max-h-32 overflow-auto">
                    {selectedLog.errorMessage}
                  </pre>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </PageLayout>
  )
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-muted-foreground w-28 shrink-0 pt-0.5">{label}</span>
      <span className="flex-1 text-sm">{children}</span>
    </div>
  )
}
