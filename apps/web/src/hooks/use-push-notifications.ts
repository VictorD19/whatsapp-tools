'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/stores/auth.store'

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/v1`

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

async function runSubscribe(onDone?: () => void) {
  try {
    const res = await fetch(`${API_URL}/notifications/vapid-public-key`)
    if (!res.ok) return
    const { data } = await res.json()
    const publicKey = data?.publicKey
    if (!publicKey) return

    const registration = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready

    const existing = await registration.pushManager.getSubscription()
    if (existing) { onDone?.(); return }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })

    const json = subscription.toJSON()
    if (!json.endpoint || !json.keys) return

    await fetch(`${API_URL}/notifications/push-subscription`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys['p256dh'], auth: json.keys['auth'] },
        userAgent: navigator.userAgent,
      }),
    })

    onDone?.()
  } catch {
    // push não suportado ou bloqueado
  }
}

export function usePushNotifications() {
  const { user } = useAuthStore()
  const subscribed = useRef(false)
  // 'default' = ainda não perguntou, 'granted' = ok, 'denied' = bloqueado
  const [permission, setPermission] = useState<NotificationPermission | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    setPermission(Notification.permission)
  }, [])

  // Se já tem permissão, subscreve automaticamente
  useEffect(() => {
    if (!user?.id || subscribed.current) return
    if (permission !== 'granted') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    const token = getToken()
    if (!token) return

    runSubscribe(() => { subscribed.current = true })
  }, [user?.id, permission])

  // Chamada pelo banner — disparada por clique do usuário
  async function requestAndSubscribe() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result !== 'granted') return
    await runSubscribe(() => { subscribed.current = true })
  }

  const showBanner =
    permission === 'default' &&
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  return { showBanner, requestAndSubscribe }
}
