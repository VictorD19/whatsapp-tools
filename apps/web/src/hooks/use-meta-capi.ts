'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { useAuthStore } from '@/stores/auth.store'

export interface MetaCapiEventRules {
  Lead?: boolean
  Contact?: boolean
  Purchase?: boolean
  Schedule?: boolean
  CompleteRegistration?: boolean
}

export interface MetaCapiConfig {
  id: string
  pixelId: string
  isActive: boolean
  eventRules: MetaCapiEventRules
  testEventCode: string | null
  createdAt: string
  updatedAt: string
}

export function useMetaCapi() {
  const t = useTranslations('settings.metaCapi')
  const { token } = useAuthStore()
  const [config, setConfig] = useState<MetaCapiConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${apiUrl}/api/v1/meta-capi/config`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      const { data } = await res.json()
      setConfig(data)
    } catch {
      toast.error(t('error.loading'))
    } finally {
      setLoading(false)
    }
  }, [token, t, apiUrl])

  useEffect(() => {
    if (token) fetchConfig()
  }, [token, fetchConfig])

  const save = async (data: {
    pixelId: string
    accessToken: string
    isActive: boolean
    eventRules: MetaCapiEventRules
    testEventCode?: string | null
  }) => {
    setSaving(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/meta-capi/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error()
      const { data: saved } = await res.json()
      setConfig(saved)
      toast.success(t('success.saved'))
    } catch {
      toast.error(t('error.saving'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/meta-capi/config`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setConfig(null)
      toast.success(t('success.removed'))
    } catch {
      toast.error(t('error.removing'))
    }
  }

  const testEvent = async (eventName?: string) => {
    setTesting(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/meta-capi/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventName }),
      })
      if (!res.ok) throw new Error()
      toast.success(t('success.tested'))
    } catch {
      toast.error(t('error.testing'))
    } finally {
      setTesting(false)
    }
  }

  return { config, loading, saving, testing, save, remove, testEvent, refetch: fetchConfig }
}
