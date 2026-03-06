'use client'

import React from 'react'
import Link from 'next/link'
import { Search, Sun, Moon, Monitor, Menu, Settings, LogOut } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth.store'
import { useNotificationsStore } from '@/stores/notifications.store'
import { useNotificationsSocket } from '@/hooks/use-notifications-socket'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { getInitials } from '@/lib/utils'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()
  const { user, clearAuth } = useAuthStore()
  const tNav = useTranslations('nav')
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  const { setUnreadCount } = useNotificationsStore()
  useNotificationsSocket()

  // Fetch initial unread count
  React.useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    if (!token) return
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'
    fetch(`${apiUrl}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((json) => { if (json?.data?.count !== undefined) setUnreadCount(json.data.count) })
      .catch(() => {})
  }, [setUnreadCount])

  const userName = mounted ? (user?.name ?? tNav('user.user')) : '...'
  const userEmail = mounted ? (user?.email ?? '') : ''
  const userInitials = mounted && user ? getInitials(user.name) : '?'

  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/80 backdrop-blur-sm px-4">
      {/* Mobile menu */}
      <Button variant="ghost" size="icon" className="h-7 w-7 lg:hidden" onClick={onMenuClick}>
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar..."
          className="pl-8 h-7 text-xs bg-muted/50 border-transparent focus-visible:border-border focus-visible:bg-background rounded-lg"
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <NotificationBell />

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              {!mounted ? (
                <Monitor className="h-4 w-4" />
              ) : theme === 'dark' ? (
                <Moon className="h-4 w-4" />
              ) : theme === 'light' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => setTheme('light')} className="text-xs gap-2">
              <Sun className="h-3.5 w-3.5" /> Claro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('dark')} className="text-xs gap-2">
              <Moon className="h-3.5 w-3.5" /> Escuro
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme('system')} className="text-xs gap-2">
              <Monitor className="h-3.5 w-3.5" /> Sistema
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Separator */}
        <div className="mx-1 h-5 w-px bg-border" />

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-accent transition-colors focus:outline-none">
              <Avatar className="h-7 w-7">
                <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-semibold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-xs font-medium text-foreground truncate max-w-[120px]">
                {userName}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 p-0 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarImage src={mounted ? user?.avatarUrl : undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-[12px] font-bold">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </div>
            <div className="p-1">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer flex items-center gap-2 px-2.5 py-2 text-sm">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Configurações
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 px-2.5 py-2 text-sm text-red-600 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer"
                onClick={() => clearAuth()}
              >
                <LogOut className="h-4 w-4" />
                {tNav('user.logout')}
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
