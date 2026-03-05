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
  GitBranch,
  Tag,
  Building,
  CreditCard,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
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
import { PlanUsageInline } from './plan-usage'

interface NavItem {
  icon: React.ElementType
  label: string
  href: string
  badge?: number
}

interface NavGroup {
  label: string
  items: NavItem[]
}

function useNavGroups(role: string, isSuperAdmin: boolean): NavGroup[] {
  const tNav = useTranslations('nav')

  const groups: NavGroup[] = [
    {
      label: tNav('groups.service'),
      items: [
        { icon: Inbox, label: tNav('items.inbox'), href: '/inbox' },
        { icon: Radio, label: tNav('items.instances'), href: '/instances' },
      ],
    },
    {
      label: tNav('groups.marketing'),
      items: [
        { icon: Megaphone, label: tNav('items.broadcasts'), href: '/broadcasts' },
        { icon: Users, label: tNav('items.groups'), href: '/groups' },
      ],
    },
    {
      label: tNav('groups.clients'),
      items: [
        { icon: UserCircle, label: tNav('items.contacts'), href: '/contacts' },
        { icon: Bot, label: tNav('items.assistants'), href: '/assistants' },
        { icon: Briefcase, label: tNav('items.crm'), href: '/crm' },
      ],
    },
  ]

  if (role === 'admin' || isSuperAdmin) {
    const settingsItems: NavItem[] = [
      { icon: GitBranch, label: tNav('items.pipeline'), href: '/settings/pipeline' },
      { icon: Tag, label: tNav('items.tags'), href: '/settings/tags' },
      { icon: Users, label: tNav('items.team'), href: '/settings/team' },
    ]
    groups.push({ label: tNav('groups.settings'), items: settingsItems })
  }

  if (isSuperAdmin) {
    groups.push({
      label: tNav('groups.admin'),
      items: [
        { icon: Building, label: tNav('items.tenants'), href: '/admin/tenants' },
        { icon: CreditCard, label: tNav('items.plans'), href: '/admin/plans' },
      ],
    })
  }

  return groups
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const tNav = useTranslations('nav')
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const navGroups = useNavGroups(user?.role ?? 'agent', user?.isSuperAdmin ?? false)

  const userName = mounted ? (user?.name ?? tNav('user.user')) : '...'
  const userEmail = mounted ? (user?.email ?? '') : ''
  const userInitials = mounted && user ? getInitials(user.name) : '?'
  const userRole = mounted ? (user?.role ?? '') : ''

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[220px]'
      )}
    >
      {/* ── Logo + collapse ── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-3">
        <Link href="/inbox" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="truncate text-[13px] font-semibold tracking-tight text-sidebar-foreground">
              WhatsApp Tools
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed && 'mx-auto'
          )}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* ── User card (clicável → dropdown) ── */}
      <div className={cn('shrink-0 px-3 pt-3 pb-2', collapsed && 'px-2')}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {collapsed ? (
              <button className="flex w-full justify-center rounded-lg p-1 hover:bg-sidebar-accent transition-colors">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-medium">{userName}</p>
                    <p className="text-muted-foreground">{userEmail}</p>
                  </TooltipContent>
                </Tooltip>
              </button>
            ) : (
              <button className="w-full rounded-xl bg-sidebar-accent/60 px-3 py-2.5 text-left hover:bg-sidebar-accent transition-colors group">
                <div className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-[11px] font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-sidebar-foreground leading-tight">
                      {userName}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {userEmail}
                    </p>
                  </div>
                  {userRole && (
                    <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                      {userRole}
                    </span>
                  )}
                </div>
              </button>
            )}
          </DropdownMenuTrigger>

          <DropdownMenuContent side="right" align="start" className="w-60 p-0 overflow-hidden">
            {/* Header com avatar */}
            <div className="flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-primary-50 to-primary-100/60 border-b">
              <Avatar className="h-9 w-9 shrink-0 ring-2 ring-white shadow-sm">
                <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[12px] font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 truncate">{userName}</p>
                <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>

            {/* Itens */}
            <div className="p-1.5">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                  <Settings className="h-4 w-4 text-gray-400 shrink-0" />
                  Configurações
                </Link>
              </DropdownMenuItem>

              <div className="my-1 border-t border-gray-100" />

              <DropdownMenuItem
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                onClick={() => clearAuth()}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {tNav('user.logout')}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Plan usage card ── */}
      <div className={cn('shrink-0 px-3 pb-3', collapsed && 'px-2')}>
        <PlanUsageInline collapsed={collapsed} />
      </div>

      <div className="mx-3 border-t border-sidebar-border/60" />

      {/* ── Nav groups (scrollable) ── */}
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {group.label}
              </p>
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer vazio — ações estão no dropdown do usuário ── */}
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
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-200',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon
        className={cn(
          'shrink-0 h-4 w-4 transition-colors',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span
          className={cn(
            'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
            isActive
              ? 'bg-primary-foreground/20 text-primary-foreground'
              : 'bg-primary text-primary-foreground'
          )}
        >
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
