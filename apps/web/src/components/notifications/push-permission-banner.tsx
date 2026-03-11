'use client'

import { Bell, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { usePushNotifications } from '@/hooks/use-push-notifications'

export function PushPermissionBanner() {
  const { showBanner, requestAndSubscribe } = usePushNotifications()
  const [dismissed, setDismissed] = useState(false)

  if (!showBanner || dismissed) return null

  return (
    <div className="flex items-center gap-3 bg-primary/10 border-b border-primary/20 px-4 py-2 text-sm">
      <Bell className="h-4 w-4 text-primary shrink-0" />
      <span className="flex-1 text-foreground">
        Ative as notificações para receber alertas mesmo com o app em segundo plano.
      </span>
      <Button
        size="sm"
        className="h-7 text-xs"
        onClick={async () => {
          await requestAndSubscribe()
          setDismissed(true)
        }}
      >
        Ativar
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}
