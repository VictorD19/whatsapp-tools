'use client'

import React, { useState } from 'react'
import { Send, Paperclip, Smile, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MessageInput() {
  const [message, setMessage] = useState('')

  function handleSend() {
    if (!message.trim()) return
    // TODO: integrate with API
    console.log('Sending:', message)
    setMessage('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2">
        {/* Attachments */}
        <button className="mb-1 text-muted-foreground hover:text-foreground transition-colors">
          <Paperclip className="h-4 w-4" />
        </button>

        {/* Textarea */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite uma mensagem... (Enter para enviar)"
          rows={1}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
            'max-h-32 scrollbar-none'
          )}
          style={{ height: 'auto' }}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement
            target.style.height = 'auto'
            target.style.height = Math.min(target.scrollHeight, 128) + 'px'
          }}
        />

        {/* Emoji */}
        <button className="mb-1 text-muted-foreground hover:text-foreground transition-colors">
          <Smile className="h-4 w-4" />
        </button>

        {/* Send or mic */}
        {message.trim() ? (
          <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <button className="mb-1 text-muted-foreground hover:text-foreground transition-colors">
            <Mic className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
