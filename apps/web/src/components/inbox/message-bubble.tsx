import React from 'react'
import { Check, CheckCheck, Bot, Reply } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/stores/inbox.store'

interface MessageBubbleProps {
  message: Message
  contactName?: string
  onReply?: (message: Message) => void
}

export function MessageBubble({ message, contactName, onReply }: MessageBubbleProps) {
  const time = new Date(message.sentAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className={cn('group flex items-center gap-1', message.fromMe ? 'justify-end' : 'justify-start')}>
      {/* Reply button — left side for sent messages */}
      {message.fromMe && onReply && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      )}

      <div
        className={cn(
          'max-w-[70%] rounded-xl px-3 py-2 text-sm',
          message.fromMe
            ? 'bg-primary-500 text-white rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {/* Quoted message preview */}
        {message.quotedMessage && (
          <div
            className={cn(
              'mb-1.5 rounded-lg px-2.5 py-1.5 border-l-2 text-[12px] leading-snug',
              message.fromMe
                ? 'bg-white/10 border-white/40'
                : 'bg-background/60 border-primary/40'
            )}
          >
            <p className={cn(
              'font-semibold text-[11px]',
              message.fromMe ? 'text-white/80' : 'text-primary'
            )}>
              {message.quotedMessage.fromMe ? 'Voce' : (contactName ?? 'Contato')}
            </p>
            <p className={cn(
              'line-clamp-2',
              message.fromMe ? 'text-white/60' : 'text-muted-foreground'
            )}>
              {message.quotedMessage.body ?? `[${message.quotedMessage.type}]`}
            </p>
          </div>
        )}

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

      {/* Reply button — right side for received messages */}
      {!message.fromMe && onReply && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
