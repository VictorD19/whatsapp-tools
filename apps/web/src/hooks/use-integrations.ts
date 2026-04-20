'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth.store'

interface Integration {
  id: string
  provider: string
  providerAccountId: string
  isActive: boolean
  tokenExpiresAt: string | null
  createdAt: string
}

export function useIntegrations() {
  const t = useTranslations('settings.integrations')
  const { token } = useAuthStore()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const fetchIntegrations = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiUrl}/api/v1/integrations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setIntegrations(data)
    } catch {
      toast.error(t('error.loading'))
    } finally {
      setLoading(false)
    }
  }, [token, t, apiUrl])

  useEffect(() => {
    if (token) fetchIntegrations()
  }, [token, fetchIntegrations])

  const connectGoogle = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/integrations/google/connect`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()

      const popup = window.open(data.url, 'google-auth', 'width=500,height=600,left=200,top=100')
      if (!popup) {
        window.location.href = data.url
        return
      }

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer)
          fetchIntegrations()
        }
      }, 500)
    } catch {
      toast.error(t('error.connecting'))
    }
  }

  const disconnect = async (id: string) => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/integrations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast.success(t('success.disconnected'))
      await fetchIntegrations()
    } catch {
      toast.error(t('error.disconnecting'))
    }
  }

  return { integrations, loading, connectGoogle, disconnect, refetch: fetchIntegrations }
}
