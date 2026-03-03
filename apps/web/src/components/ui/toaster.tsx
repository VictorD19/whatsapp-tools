'use client'

import * as React from 'react'
import * as ToastPrimitive from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'destructive'
}

let toastCount = 0
let listeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

function dispatch(updated: Toast[]) {
  toasts = updated
  listeners.forEach((l) => l(toasts))
}

export function toast(opts: Omit<Toast, 'id'>) {
  const id = String(++toastCount)
  dispatch([...toasts, { ...opts, id }])
  setTimeout(() => {
    dispatch(toasts.filter((t) => t.id !== id))
  }, 4000)
}

function useToasts() {
  const [state, setState] = React.useState<Toast[]>(toasts)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      listeners = listeners.filter((l) => l !== setState)
    }
  }, [])
  return state
}

const variantClasses: Record<string, string> = {
  default: 'border bg-background text-foreground',
  success: 'border-green-500/50 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100',
  destructive: 'border-red-500/50 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100',
}

export function Toaster() {
  const items = useToasts()

  return (
    <ToastPrimitive.Provider swipeDirection="right">
      {items.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full',
            variantClasses[t.variant ?? 'default']
          )}
          onOpenChange={(open) => {
            if (!open) dispatch(toasts.filter((x) => x.id !== t.id))
          }}
        >
          <div className="grid gap-1">
            {t.title && <p className="text-sm font-semibold">{t.title}</p>}
            {t.description && <p className="text-sm opacity-90">{t.description}</p>}
          </div>
          <ToastPrimitive.Close className="rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground">
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastPrimitive.Viewport className="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:max-w-[420px]" />
    </ToastPrimitive.Provider>
  )
}
