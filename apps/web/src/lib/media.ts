const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1`

export function getMediaUrl(messageId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return `${API_URL}/inbox/messages/${messageId}/media?token=${token ?? ''}`
}

export async function downloadMedia(messageId: string, filename?: string) {
  const url = getMediaUrl(messageId)
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const objectUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.download = filename ?? `media-${messageId}`
    a.click()
    URL.revokeObjectURL(objectUrl)
  } catch {
    window.open(url, '_blank')
  }
}
