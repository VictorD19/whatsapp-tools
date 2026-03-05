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
  GitBranch,
  Tag,
  Building,
  CreditCard,
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
import { PlanUsage } from './plan-usage'

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

function getNavGroups(role: string, isSuperAdmin: boolean) {
  const groups: NavGroup[] = [
    {
      label: 'Atendimento',
      items: [
        { icon: Inbox, label: 'Inbox', href: '/inbox' },
        { icon: Radio, label: 'Instancias', href: '/instances' },
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

  // Settings group: only for admin+ roles
  if (role === 'admin' || isSuperAdmin) {
    const settingsItems: NavItem[] = [
      { icon: GitBranch, label: 'Pipeline', href: '/settings/pipeline' },
      { icon: Tag, label: 'Tags', href: '/settings/tags' },
    ]

    settingsItems.push({ icon: Users, label: 'Equipe', href: '/settings/team' })

    groups.push({ label: 'Configuracoes', items: settingsItems })
  }

  // Super admin group
  if (isSuperAdmin) {
    groups.push({
      label: 'Administracao',
      items: [
        { icon: Building, label: 'Tenants', href: '/admin/tenants' },
        { icon: CreditCard, label: 'Planos', href: '/admin/plans' },
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
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const navGroups = React.useMemo(
    () => getNavGroups(user?.role ?? 'agent', user?.isSuperAdmin ?? false),
    [user?.role, user?.isSuperAdmin],
  )

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[60px]' : 'w-[240px]'
      )}
    >
      {/* Logo + collapse */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-3">
        <Link href="/inbox" className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
            <MessageSquare className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="truncate text-[14px] font-semibold tracking-tight text-sidebar-foreground">
              WhatsApp Tools
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-all duration-300 hover:bg-sidebar-accent hover:text-sidebar-foreground',
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
      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
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

      {/* Bottom — plan usage + settings + user */}
      <div className="border-t border-sidebar-border px-3 py-2 space-y-0.5">
        <PlanUsage collapsed={collapsed} />
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
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 transition-all duration-300 hover:bg-sidebar-accent',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
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
        'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-300',
        isActive
          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
          : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
        collapsed && 'justify-center px-2'
      )}
    >
      <Icon
        className={cn(
          'shrink-0 h-4 w-4 transition-colors duration-300',
          isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-foreground'
        )}
      />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {!collapsed && item.badge ? (
        <span className={cn(
          'ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
          isActive
            ? 'bg-primary-foreground/20 text-primary-foreground'
            : 'bg-primary text-primary-foreground'
        )}>
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
