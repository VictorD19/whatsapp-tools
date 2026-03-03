'use client'

import React, { useState } from 'react'
import { Send, Paperclip, Smile } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MessageInputProps {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Digite uma mensagem... (Enter para enviar)',
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!message.trim() || disabled || sending) return
    setSending(true)
    try {
      await onSend(message.trim())
      setMessage('')
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border p-3">
      <div
        className={cn(
          'flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2',
          disabled && 'opacity-50'
        )}
      >
        {/* Attachments */}
        <button
          className="mb-1 text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
        >
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            'max-h-32 scrollbar-none disabled:cursor-not-allowed'
          )}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = Math.min(target.scrollHeight, 128) + 'px'
          }}
        />

        {/* Emoji */}
        <button
          className="mb-1 text-muted-foreground hover:text-foreground transition-colors"
          disabled={disabled}
        >
          <Smile className="h-4 w-4" />
        </button>

        {/* Send */}
        {message.trim() && !disabled && (
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={handleSend}
            disabled={sending}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
