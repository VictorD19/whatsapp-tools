'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Smile, Image, FileText, Video, Mic, AudioLines, X } from 'lucide-react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { cn } from '@/lib/utils'
import type { Message } from '@/stores/inbox.store'

const attachmentOptions = [
  { key: 'image', icon: Image, label: 'Imagem', color: 'text-violet-400' },
  { key: 'video', icon: Video, label: 'Vídeo', color: 'text-blue-400' },
  { key: 'audio', icon: Mic, label: 'Áudio', color: 'text-emerald-400' },
  { key: 'audio-recorded', icon: AudioLines, label: 'Áudio gravado', color: 'text-pink-400' },
  { key: 'document', icon: FileText, label: 'Documento', color: 'text-orange-400' },
]

interface MessageInputProps {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  replyingTo?: Message | null
  onCancelReply?: () => void
  contactName?: string
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = 'Digite uma mensagem... (Enter para enviar)',
  replyingTo,
  onCancelReply,
  contactName,
}: MessageInputProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const emojiRef = useRef<HTMLDivElement>(null)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const attachRef = useRef<HTMLDivElement>(null)
  const attachButtonRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        showEmoji &&
        emojiRef.current &&
        !emojiRef.current.contains(e.target as Node) &&
        !emojiButtonRef.current?.contains(e.target as Node)
      ) {
        setShowEmoji(false)
      }
      if (
        showAttach &&
        attachRef.current &&
        !attachRef.current.contains(e.target as Node) &&
        !attachButtonRef.current?.contains(e.target as Node)
      ) {
        setShowAttach(false)
      }
    }
    if (showEmoji || showAttach) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmoji, showAttach])

  function handleEmojiSelect(emoji: { native: string }) {
    setMessage((prev) => prev + emoji.native)
    textareaRef.current?.focus()
  }

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
      {/* Reply preview bar */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 rounded-lg bg-muted/50 px-3 py-2 border-l-2 border-primary">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-primary">
              {replyingTo.fromMe ? 'Voce' : (contactName ?? 'Contato')}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {replyingTo.body ?? `[${replyingTo.type}]`}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'relative flex items-end gap-2 rounded-xl border border-input bg-background px-3 py-2 overflow-visible',
          disabled && 'opacity-50'
        )}
      >
        {/* Attachments + Emoji */}
        <div className="relative flex items-center gap-1.5">
          {/* Attach button */}
          <button
            ref={attachButtonRef}
            className={cn(
              'mb-1 transition-colors',
              showAttach
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            disabled={disabled}
            onClick={() => {
              setShowAttach((v) => !v)
              setShowEmoji(false)
            }}
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Emoji button */}
          <button
            ref={emojiButtonRef}
            className={cn(
              'mb-1 transition-colors',
              showEmoji
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
            disabled={disabled}
            onClick={() => {
              setShowEmoji((v) => !v)
              setShowAttach(false)
            }}
          >
            <Smile className="h-4 w-4" />
          </button>

          {/* Attach popover */}
          {showAttach && (
            <div
              ref={attachRef}
              className="absolute bottom-9 left-0 z-50 rounded-lg border border-border bg-popover p-1 shadow-xl"
            >
              <div className="flex flex-col">
                {attachmentOptions.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setShowAttach(false)}
                    className="flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-muted/60 transition-colors whitespace-nowrap"
                  >
                    <opt.icon className={cn('h-4 w-4', opt.color)} />
                    <span className="text-xs font-medium text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji picker */}
          {showEmoji && (
            <div ref={emojiRef} className="absolute bottom-8 left-0 z-50">
              <Picker
                data={data}
                onEmojiSelect={handleEmojiSelect}
                theme="dark"
                locale="pt"
                previewPosition="none"
                skinTonePosition="none"
                maxFrequentRows={2}
              />
            </div>
          )}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
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

        {/* Send */}
        <button
          className="mb-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={!message.trim() || disabled || sending}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
