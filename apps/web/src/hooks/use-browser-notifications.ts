'use client'

export function useBrowserNotifications() {
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }

  const showBrowserNotification = (
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): void => {
    if (typeof window === 'undefined' || Notification.permission !== 'granted') return
    const n = new Notification(title, { body, icon: '/favicon.ico', data })
    n.onclick = () => window.focus()
  }

  return { requestPermission, showBrowserNotification }
}
