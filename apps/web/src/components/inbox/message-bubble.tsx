import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, CheckCheck, Bot, Reply, FileText, Download, Pause, Play, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMediaUrl, downloadMedia } from '@/lib/media'
import type { Message } from '@/stores/inbox.store'

interface MessageBubbleProps {
  message: Message
  contactName?: string
  contactPhone?: string
  onReply?: (message: Message) => void
  onMediaClick?: (messageId: string) => void
}

function AudioPlayer({ src, fromMe }: { src: string; fromMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)

  // Stable pseudo-random waveform based on URL
  const bars = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const seed = src.charCodeAt(i % Math.max(src.length, 1))
      return 20 + ((i * 13 + seed) % 65)
    })
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
      setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0)
    }
    const onMetadata = () => setDuration(audio.duration)
    const onEnded = () => { setIsPlaying(false); setProgress(0); setCurrentTime(0) }

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onMetadata)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onMetadata)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) { audio.pause(); setIsPlaying(false) }
    else { audio.play(); setIsPlaying(true) }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audio.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration
  }

  const formatTime = (s: number) => {
    if (!isFinite(s) || s <= 0) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2 min-w-[210px]">
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play/Pause */}
      <button
        onClick={togglePlay}
        className={cn(
          'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-colors',
          fromMe ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/15 hover:bg-primary/25',
        )}
      >
        {isPlaying
          ? <Pause className="h-3.5 w-3.5" />
          : <Play className="h-3.5 w-3.5 ml-0.5" />}
      </button>

      {/* Waveform bars */}
      <div
        className="flex flex-1 items-center gap-[2px] h-8 cursor-pointer"
        onClick={handleSeek}
      >
        {bars.map((height, i) => {
          const filled = (i / bars.length) <= progress
          return (
            <div
              key={i}
              style={{ height: `${height}%` }}
              className={cn(
                'flex-1 rounded-full',
                fromMe
                  ? filled ? 'bg-white' : 'bg-white/35'
                  : filled ? 'bg-primary' : 'bg-primary/30',
              )}
            />
          )
        })}
      </div>

      {/* Duration / current time */}
      <span className={cn(
        'shrink-0 text-[10px] tabular-nums w-8 text-right',
        fromMe ? 'text-white/70' : 'text-muted-foreground',
      )}>
        {currentTime > 0 ? formatTime(currentTime) : formatTime(duration)}
      </span>
    </div>
  )
}

function MediaContent({ message, onMediaClick }: { message: Message; onMediaClick?: (id: string) => void }) {
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
            onClick={() => onMediaClick ? onMediaClick(message.id) : window.open(mediaUrl, '_blank')}
          />
          {message.body && (
            <p className="leading-relaxed whitespace-pre-wrap break-words mt-1">{message.body}</p>
          )}
        </div>
      )

    case 'VIDEO':
      return (
        <div className="mb-1 relative group/video">
          <video
            src={mediaUrl}
            controls
            preload="metadata"
            className="rounded-lg max-w-full max-h-64"
          />
          {onMediaClick && (
            <button
              onClick={() => onMediaClick(message.id)}
              className="absolute top-1.5 right-1.5 p-1 rounded bg-black/50 text-white opacity-0 group-hover/video:opacity-100 transition-opacity"
              title="Abrir em tela cheia"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {message.body && (
            <p className="leading-relaxed whitespace-pre-wrap break-words mt-1">{message.body}</p>
          )}
        </div>
      )

    case 'AUDIO':
      return (
        <div className="mb-1">
          <AudioPlayer src={mediaUrl} fromMe={message.fromMe} />
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
          onClick={() => downloadMedia(message.id, message.body ?? 'documento')}
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
        <p className="leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
      ) : null
  }
}

function ReactionBubbles({ reactions, fromMe }: { reactions: { senderJid: string; emoji: string }[]; fromMe: boolean }) {
  if (!reactions || reactions.length === 0) return null

  // Group by emoji and count
  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className={cn('flex flex-wrap gap-1 mt-0.5', fromMe ? 'justify-end' : 'justify-start')}>
      {Object.entries(grouped).map(([emoji, count]) => (
        <span
          key={emoji}
          className="inline-flex items-center gap-0.5 bg-background border border-border rounded-full px-1.5 py-0.5 text-xs shadow-sm select-none"
        >
          <span>{emoji}</span>
          {count > 1 && <span className="text-muted-foreground text-[10px] font-medium">{count}</span>}
        </span>
      ))}
    </div>
  )
}

export function MessageBubble({ message, contactName, contactPhone, onReply, onMediaClick }: MessageBubbleProps) {
  const time = new Date(message.sentAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const isMediaType = ['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'STICKER'].includes(message.type)
  const hasReactions = message.reactions && message.reactions.length > 0

  // Para grupos: usa senderName ou senderJid; para 1:1: usa contactName
  const isGroupMessage = !message.fromMe && (message.senderJid != null || message.senderName != null)
  // senderJid pode ser número limpo ou JID bruto (@lid, @g.us) — exibir só se for dígitos puros
  const senderPhoneClean = message.senderJid && /^\d+$/.test(message.senderJid)
    ? message.senderJid
    : null
  const senderLabel = isGroupMessage
    ? (message.senderName ?? senderPhoneClean ?? contactName)
    : contactName
  const senderPhone = isGroupMessage ? (senderPhoneClean ?? undefined) : contactPhone

  return (
    <div className={cn('group flex items-end gap-1', message.fromMe ? 'justify-end' : 'justify-start')}>
      {/* Reply button — left side for sent messages */}
      {message.fromMe && onReply && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded mb-1"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Bubble + reactions column */}
      <div className="flex flex-col max-w-[336px] min-w-0">
        <div
          className={cn(
            'rounded-xl px-3 py-2 text-sm',
            message.fromMe
              ? 'bg-primary-500 text-white rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          {/* Contact name + phone header (received messages only) */}
          {!message.fromMe && senderLabel && (
            <div className="mb-1">
              <span className="text-[11px] font-semibold text-primary leading-none">
                {senderLabel}
              </span>
              {senderPhone && senderPhone !== senderLabel && (
                <span className="text-[10px] text-muted-foreground ml-1.5 leading-none">
                  {senderPhone}
                </span>
              )}
            </div>
          )}

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
            <MediaContent message={message} onMediaClick={onMediaClick} />
          ) : (
            message.body && <p className="leading-relaxed whitespace-pre-wrap break-words">{message.body}</p>
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

        {/* Reactions below bubble */}
        {hasReactions && (
          <ReactionBubbles reactions={message.reactions} fromMe={message.fromMe} />
        )}
      </div>

      {/* Reply button — right side for received messages */}
      {!message.fromMe && onReply && (
        <button
          onClick={() => onReply(message)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-1 rounded mb-1"
        >
          <Reply className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
