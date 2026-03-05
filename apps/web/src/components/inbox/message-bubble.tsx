import React from 'react'
import { Check, CheckCheck, Bot, Reply, FileText, Download, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/stores/inbox.store'

interface MessageBubbleProps {
  message: Message
  contactName?: string
  onReply?: (message: Message) => void
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/api/v1`

function getMediaUrl(messageId: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  return `${API_URL}/inbox/messages/${messageId}/media?token=${token ?? ''}`
}

function MediaContent({ message }: { message: Message }) {
  const mediaUrl = getMediaUrl(message.id)

  switch (message.type) {
    case 'IMAGE':
      return (
        <div className="mb-1">
          <img
            src={mediaUrl}
            alt={message.body ?? 'Imagem'}
            className="rounded-lg max-w-full max-h-64 object-cover cursor-pointer"
            loading="lazy"
            onClick={() => window.open(mediaUrl, '_blank')}
          />
          {message.body && (
            <p className="leading-relaxed whitespace-pre-wrap mt-1">{message.body}</p>
          )}
        </div>
      )

    case 'VIDEO':
      return (
        <div className="mb-1">
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            className="rounded-lg max-w-full max-h-64"
          />
          {message.body && (
            <p className="leading-relaxed whitespace-pre-wrap mt-1">{message.body}</p>
          )}
        </div>
      )

    case 'AUDIO':
      return (
        <div className="mb-1 min-w-[200px]">
          <audio src={mediaUrl} controls preload="metadata" className="w-full h-8" />
        </div>
      )

    case 'STICKER':
      return (
        <div className="mb-1">
          <img
            src={mediaUrl}
            alt="Sticker"
            className="max-w-[150px] max-h-[150px]"
            loading="lazy"
          />
        </div>
      )

    case 'DOCUMENT':
      return (
        <button
          onClick={async () => {
            try {
              const res = await fetch(mediaUrl)
              const blob = await res.blob()
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = message.body ?? 'documento'
              a.click()
              URL.revokeObjectURL(url)
            } catch {
              // Fallback: open in new tab
              window.open(mediaUrl, '_blank')
            }
          }}
          className={cn(
            'flex items-center gap-2 mb-1 p-2 rounded-lg w-full text-left',
            'bg-black/10 hover:bg-black/20 transition-colors cursor-pointer'
          )}
        >
          <FileText className="h-8 w-8 shrink-0 opacity-70" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{message.body ?? 'Documento'}</p>
          </div>
          <Download className="h-4 w-4 shrink-0 opacity-60" />
        </button>
      )

    default:
      return message.body ? (
        <p className="leading-relaxed whitespace-pre-wrap">{message.body}</p>
      ) : null
  }
}

export function MessageBubble({ message, contactName, onReply }: MessageBubbleProps) {
  const time = new Date(message.sentAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isMediaType = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'].includes(message.type)

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

        {/* Media or text content */}
        {isMediaType ? (
          <MediaContent message={message} />
        ) : (
          message.body && <p className="leading-relaxed whitespace-pre-wrap">{message.body}</p>
        )}

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
