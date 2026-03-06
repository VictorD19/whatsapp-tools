'use client'

import { toast as sonner, Toaster as SonnerToaster } from 'sonner'

type Variant = 'default' | 'success' | 'destructive' | 'warning' | 'info'

interface ToastOptions {
  title: string
  description?: string
  variant?: Variant
}

export function toast({ title, description, variant = 'default' }: ToastOptions) {
  const opts = description ? { description } : {}

  switch (variant) {
    case 'success':
      return sonner.success(title, opts)
    case 'destructive':
      return sonner.error(title, opts)
    case 'warning':
      return sonner.warning(title, opts)
    case 'info':
      return sonner.info(title, opts)
    default:
      return sonner(title, opts)
  }
}

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: 'font-sans text-sm rounded-xl border shadow-md',
          title: 'font-semibold',
          description: 'text-xs opacity-80',
          closeButton: 'rounded-lg',
        },
      }}
    />
  )
}
