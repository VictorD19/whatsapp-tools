'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Inbox,
  Radio,
  Megaphone,
  Users,
  UserCircle,
  Bot,
  Briefcase,
  Settings,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
}

const navItems: NavItem[] = [
  { icon: Inbox, label: 'Inbox', href: '/inbox' },
  { icon: Radio, label: 'Instâncias', href: '/instances' },
  { icon: Megaphone, label: 'Disparos', href: '/broadcasts' },
  { icon: Users, label: 'Grupos', href: '/groups' },
  { icon: UserCircle, label: 'Contatos', href: '/contacts' },
  { icon: Bot, label: 'Assistentes', href: '/assistants' },
  { icon: Briefcase, label: 'CRM', href: '/crm' },
]

const bottomItems: NavItem[] = [{ icon: Settings, label: 'Configurações', href: '/settings' }]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-3">
        <Link href="/inbox" className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-500">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="truncate text-sm font-semibold text-sidebar-foreground">WhatsApp Tools</span>
          )}
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}

        <Separator className="my-2 bg-sidebar-border" />

        {bottomItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-md p-2 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  )
}

function NavLink({
  item,
  pathname,
  collapsed,
}: {
  item: NavItem
  pathname: string
  collapsed: boolean
}) {
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
  const Icon = item.icon

  const linkContent = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 rounded-md px-2 py-2 text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary-500/10 text-primary-500'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon className={cn('shrink-0', isActive ? 'text-primary-500' : '', 'h-[18px] w-[18px]')} />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 text-xs font-medium text-white">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
