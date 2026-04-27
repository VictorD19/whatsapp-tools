const COLOR_POOL = [
  { bg: '#dcfce9', border: '#008b46', text: '#005e30' },
  { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
  { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
  { bg: '#f3e8ff', border: '#8b5cf6', text: '#6d28d9' },
  { bg: '#fce7f3', border: '#ec4899', text: '#9d174d' },
  { bg: '#cffafe', border: '#06b6d4', text: '#155e75' },
  { bg: '#ffedd5', border: '#f97316', text: '#9a3412' },
  { bg: '#e0e7ff', border: '#6366f1', text: '#3730a3' },
]

const assistantColorMap = new Map<string, number>()

export function getAssistantColor(assistantId: string | null | undefined) {
  if (!assistantId) return COLOR_POOL[0]

  if (!assistantColorMap.has(assistantId)) {
    assistantColorMap.set(assistantId, assistantColorMap.size % COLOR_POOL.length)
  }

  return COLOR_POOL[assistantColorMap.get(assistantId)!]
}
