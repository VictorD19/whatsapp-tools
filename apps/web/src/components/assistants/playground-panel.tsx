'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Trash2, Bot, User, Wrench, Loader2, FlaskConical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTranslations } from 'next-intl'
import { apiPost } from '@/lib/api'
import type { ApiResponse } from './types'

interface ExecutedTool {
  type: string
  name: string
  output: string
  success: boolean
}

interface PlaygroundMessage {
  role: 'user' | 'assistant'
  content: string
  tools?: ExecutedTool[]
}

interface PlaygroundResponse {
  reply: string
  executedTools: ExecutedTool[]
}

export interface PlaygroundDraft {
  name: string
  description: string
  model: string
  systemPrompt: string
  knowledgeBaseIds: string[]
  aiToolIds: string[]
}

interface PlaygroundPanelProps {
  draft: PlaygroundDraft
}

export function PlaygroundPanel({ draft }: PlaygroundPanelProps) {
  const t = useTranslations('assistants')
  const [messages, setMessages] = useState<PlaygroundMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || loading) return
    if (!draft.name.trim()) {
      setError(t('playground.needName'))
      return
    }
    setError(null)

    const nextMessages: PlaygroundMessage[] = [...messages, { role: 'user', content: text }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await apiPost<ApiResponse<PlaygroundResponse>>('assistants/playground', {
        name: draft.name,
        description: draft.description || undefined,
        model: draft.model,
        systemPrompt: draft.systemPrompt,
        knowledgeBaseIds: draft.knowledgeBaseIds,
        aiToolIds: draft.aiToolIds,
        messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
      })
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.data.reply, tools: res.data.executedTools },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : t('playground.error'))
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, draft, t])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex flex-col h-full rounded-lg border bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{t('playground.title')}</span>
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-muted-foreground"
            onClick={() => {
              setMessages([])
              setError(null)
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('playground.clear')}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !loading ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-8">
            <FlaskConical className="h-8 w-8 mb-3 opacity-40" />
            <p className="text-sm">{t('playground.empty')}</p>
            <p className="text-xs mt-1">{t('playground.emptyHint')}</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${
                  msg.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                }`}
              >
                {msg.role === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className={`flex flex-col gap-1.5 max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-sm'
                      : 'bg-background border rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
                {msg.tools && msg.tools.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {msg.tools.map((tool, ti) => (
                      <span
                        key={ti}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border ${
                          tool.success
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                        title={tool.output}
                      >
                        <Wrench className="h-3 w-3" />
                        {tool.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-2.5">
            <div className="h-7 w-7 shrink-0 rounded-full bg-muted text-foreground flex items-center justify-center">
              <Bot className="h-3.5 w-3.5" />
            </div>
            <div className="bg-background border rounded-2xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-xs">{t('playground.typing')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-t border-red-100">{error}</div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 p-3 border-t bg-background">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('playground.inputPlaceholder')}
          disabled={loading}
        />
        <Button size="icon" onClick={send} disabled={loading || !input.trim()} className="shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
