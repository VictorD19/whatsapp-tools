'use client'

import React from 'react'
import { Bell, Search, Sun, Moon, Monitor, Menu } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TopbarProps {
  onMenuClick?: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { theme, setTheme } = useTheme()

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

      <div className="ml-auto flex items-center gap-0.5">
        {/* Notifications */}
        <Button variant="ghost" size="icon" className="relative h-7 w-7 text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 ring-1 ring-background" />
        </Button>

        {/* Theme toggle */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
              {theme === 'dark' ? (
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
      </div>
    </header>
  )
}
