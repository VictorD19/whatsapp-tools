// Service Worker — Push Notifications
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const title = data.title ?? 'SistemaZapChat'
  const options = {
    body: data.body ?? '',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: data.data ?? {},
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const conversationId = event.notification.data?.conversationId
  const url = conversationId
    ? `/inbox?conversation=${conversationId}`
    : '/inbox'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    }),
  )
})
