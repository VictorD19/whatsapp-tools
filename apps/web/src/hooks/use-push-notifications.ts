'use client'

import { useEffect, useRef } from 'react'
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

export function usePushNotifications() {
  const { user } = useAuthStore()
  const subscribed = useRef(false)

  useEffect(() => {
    if (!user?.id || subscribed.current) return
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (Notification.permission !== 'granted') return

    const token = getToken()
    if (!token) return

    async function subscribe() {
      try {
        // Busca chave pública VAPID do backend
        const res = await fetch(`${API_URL}/notifications/vapid-public-key`)
        if (!res.ok) return
        const { publicKey } = await res.json()
        if (!publicKey) return

        // Registra o Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        // Verifica se já tem subscription ativa
        const existing = await registration.pushManager.getSubscription()
        if (existing) {
          subscribed.current = true
          return
        }

        // Cria nova subscription
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

        const json = subscription.toJSON()
        if (!json.endpoint || !json.keys) return

        // Envia subscription para o backend
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

        subscribed.current = true
      } catch {
        // Push pode não ser suportado ou bloqueado — falha silenciosa
      }
    }

    subscribe()
  }, [user?.id])
}
