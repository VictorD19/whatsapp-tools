import React from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageLayoutProps {
  breadcrumb: BreadcrumbItem[]
  children: React.ReactNode
  /**
   * Classes extras para o card principal.
   * Por padrão: "p-5 space-y-5"
   * Casos especiais (ex: CRM): "flex flex-col overflow-hidden"
   */
  cardClassName?: string
}

/**
 * Wrapper padrão para páginas do dashboard.
 * Aplica o padrão: padding externo + breadcrumb + card branco full-height.
 *
 * Uso:
 * <PageLayout breadcrumb={[{ label: 'Marketing' }, { label: 'Disparos' }]}>
 *   {conteúdo}
 * </PageLayout>
 */
export function PageLayout({ breadcrumb, children, cardClassName }: PageLayoutProps) {
  return (
    <div className="p-6 flex flex-col gap-3 min-h-[calc(100vh-3rem)]">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        {breadcrumb.map((item, i) => {
          const isLast = i === breadcrumb.length - 1
          return (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
              {!isLast && item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'text-foreground font-medium' : ''}>
                  {item.label}
                </span>
              )}
            </React.Fragment>
          )
        })}
      </nav>

      {/* Card principal */}
      <div className={cn('rounded-xl border bg-card flex-1', cardClassName ?? 'p-5 space-y-5')}>
        {children}
      </div>
    </div>
  )
}
