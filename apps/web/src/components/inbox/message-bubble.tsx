import React from 'react'
import { Check, CheckCheck, Bot } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/stores/inbox.store'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const time = new Date(message.sentAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={cn('flex', message.fromMe ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-xl px-3 py-2 text-sm',
          message.fromMe
            ? 'bg-primary-500 text-white rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {message.fromBot && (
          <div className={cn(
            'flex items-center gap-1 text-[10px] mb-1',
            message.fromMe ? 'text-white/60' : 'text-muted-foreground'
          )}>
            <Bot className="h-3 w-3" />
            <span>Assistente IA</span>
          </div>
        )}
        <p className="leading-relaxed whitespace-pre-wrap">{message.body}</p>
        <div className="flex items-center gap-1 mt-1 justify-end">
          <span className={cn('text-[10px]', message.fromMe ? 'text-white/70' : 'text-muted-foreground')}>
            {time}
          </span>
          {message.fromMe && (
            <span className="text-white/70">
              {message.status === 'READ' ? (
                <CheckCheck className="h-3 w-3 text-blue-200" />
              ) : message.status === 'DELIVERED' ? (
                <CheckCheck className="h-3 w-3" />
              ) : message.status === 'FAILED' ? (
                <span className="text-red-300 text-[10px]">!</span>
              ) : (
                <Check className="h-3 w-3" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
