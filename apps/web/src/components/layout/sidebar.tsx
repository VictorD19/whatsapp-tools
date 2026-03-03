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
  LogOut,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth.store'
import { getInitials } from '@/lib/utils'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
}

const navGroups = [
  {
    label: 'Atendimento',
    items: [
      { icon: Inbox, label: 'Inbox', href: '/inbox' },
      { icon: Radio, label: 'Instâncias', href: '/instances' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { icon: Megaphone, label: 'Disparos', href: '/broadcasts' },
      { icon: Users, label: 'Grupos', href: '/groups' },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { icon: UserCircle, label: 'Contatos', href: '/contacts' },
      { icon: Bot, label: 'Assistentes', href: '/assistants' },
      { icon: Briefcase, label: 'CRM', href: '/crm' },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-background transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* Logo + collapse */}
      <div className="flex h-14 items-center justify-between border-b border-border px-3">
        <Link href="/inbox" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500 shadow-sm">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="truncate text-[13px] font-semibold tracking-tight text-foreground">
              WhatsApp Tools
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-2 py-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom — settings + user */}
      <div className="border-t border-border px-2 py-2 space-y-0.5">
        <NavLink
          item={{ icon: Settings, label: 'Configurações', href: '/settings' }}
          pathname={pathname}
          collapsed={collapsed}
        />

        {/* User profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                <AvatarFallback className="bg-emerald-500 text-white text-[10px] font-semibold">
                  {mounted && user ? getInitials(user.name) : '?'}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 overflow-hidden text-left">
                  <p className="truncate text-[12px] font-medium text-foreground leading-tight">
                    {mounted ? (user?.name ?? 'Usuário') : '...'}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground leading-tight">
                    {mounted ? (user?.email ?? '') : ''}
                  </p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-52 mb-1">
            <DropdownMenuLabel className="py-1.5">
              <p className="text-sm font-medium">{mounted ? user?.name : '...'}</p>
              <p className="text-xs font-normal text-muted-foreground">{mounted ? user?.email : ''}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-3.5 w-3.5" />
              Meu perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => clearAuth()}
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        'group relative flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-all duration-150',
        isActive
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-emerald-500" />
      )}
      <Icon
        className={cn(
          'shrink-0 h-4 w-4 transition-colors',
          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground group-hover:text-foreground'
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkContent
}
