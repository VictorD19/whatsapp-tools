import React from 'react'
import { Check, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  text: string
  fromMe: boolean
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
}

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const time = new Date(message.timestamp).toLocaleTimeString('pt-BR', {
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
        <p className="leading-relaxed">{message.text}</p>
        <div className={cn('flex items-center gap-1 mt-1', message.fromMe ? 'justify-end' : 'justify-end')}>
          <span className={cn('text-[10px]', message.fromMe ? 'text-white/70' : 'text-muted-foreground')}>
            {time}
          </span>
          {message.fromMe && (
            <span className="text-white/70">
              {message.status === 'read' ? (
                <CheckCheck className="h-3 w-3 text-blue-200" />
              ) : message.status === 'delivered' ? (
                <CheckCheck className="h-3 w-3" />
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
