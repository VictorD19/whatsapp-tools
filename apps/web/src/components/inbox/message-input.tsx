'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Send, Paperclip, Smile, Image, FileText, Video, Mic, AudioLines, X, Music,
} from 'lucide-react'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { cn } from '@/lib/utils'
import type { Message } from '@/stores/inbox.store'

// ─── Attachment options ───────────────────────────────────────────────────────

const attachmentOptions = [
  { key: 'image',          icon: Image,      label: 'Imagem',       color: 'text-violet-400', accept: 'image/*' },
  { key: 'video',          icon: Video,      label: 'Vídeo',        color: 'text-blue-400',   accept: 'video/*' },
  { key: 'audio',          icon: Mic,        label: 'Áudio',        color: 'text-primary-400',accept: 'audio/*' },
  { key: 'audio-recorded', icon: AudioLines, label: 'Áudio gravado',color: 'text-pink-400',   accept: null },
  { key: 'document',       icon: FileText,   label: 'Documento',    color: 'text-orange-400', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.7z' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDocMeta(mimetype: string, name: string): { label: string; bg: string; color: string } {
  if (mimetype === 'application/pdf' || name.endsWith('.pdf'))
    return { label: 'PDF', bg: 'bg-red-500/15', color: 'text-red-400' }
  if (mimetype.includes('word') || /\.docx?$/.test(name))
    return { label: 'DOC', bg: 'bg-blue-500/15', color: 'text-blue-400' }
  if (mimetype.includes('excel') || /\.xlsx?$/.test(name))
    return { label: 'XLS', bg: 'bg-green-500/15', color: 'text-green-400' }
  if (mimetype.includes('powerpoint') || /\.pptx?$/.test(name))
    return { label: 'PPT', bg: 'bg-orange-500/15', color: 'text-orange-400' }
  if (/\.(zip|rar|7z)$/.test(name))
    return { label: 'ZIP', bg: 'bg-yellow-500/15', color: 'text-yellow-400' }
  return { label: 'ARQ', bg: 'bg-muted', color: 'text-muted-foreground' }
}

/** Deterministic pseudo-waveform from filename chars */
function generateWaveform(name: string, count = 30): number[] {
  const seed = name.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
  return Array.from({ length: count }, (_, i) => {
    const v = Math.abs(Math.sin(seed * 0.01 + i * 2.1) * 0.5 + Math.cos(i * 1.5 + seed * 0.05) * 0.5)
    return 18 + Math.round(v * 70) // 18 – 88 %
  })
}

// ─── FilePreview ──────────────────────────────────────────────────────────────

interface FilePreviewProps {
  file: File
  onRemove: () => void
}

function FilePreview({ file, onRemove }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')
  const isAudio = file.type.startsWith('audio/')

  useEffect(() => {
    if (isImage) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file, isImage])

  const waveform = isAudio ? generateWaveform(file.name) : []

  return (
    <div className="animate-in slide-in-from-bottom-3 fade-in-0 duration-200">
      {/* ── Image ── */}
      {isImage && previewUrl && (
        <div className="relative inline-flex rounded-xl overflow-hidden shadow-md max-w-[140px] group">
          <img
            src={previewUrl}
            alt={file.name}
            className="max-h-[100px] w-full object-cover"
          />
          <button
            onClick={onRemove}
            className="absolute top-1 right-1 rounded-full bg-black/50 hover:bg-black/75 text-white p-0.5 transition-colors backdrop-blur-sm"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* ── Video ── */}
      {isVideo && (
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3 max-w-[300px] shadow-sm">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Video className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">{formatSize(file.size)} · Vídeo</p>
          </div>
          <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ── Audio ── */}
      {isAudio && (
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3 max-w-[300px] shadow-sm">
          <div className="shrink-0 h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
            <Music className="h-5 w-5 text-primary" />
          </div>
          {/* waveform bars */}
          <div className="flex items-center gap-[2px] flex-1 h-8">
            {waveform.map((h, i) => (
              <div
                key={i}
                className="w-[3px] rounded-full bg-primary/50"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
            <button onClick={onRemove} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── Document ── */}
      {!isImage && !isVideo && !isAudio && (
        <div className="flex items-center gap-3 rounded-2xl bg-card border border-border/60 px-4 py-3 max-w-[300px] shadow-sm">
          <div className={cn('shrink-0 h-11 w-11 rounded-xl flex items-center justify-center', getDocMeta(file.type, file.name).bg)}>
            <FileText className={cn('h-5 w-5', getDocMeta(file.type, file.name).color)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {getDocMeta(file.type, file.name).label} · {formatSize(file.size)}
            </p>
          </div>
          <button onClick={onRemove} className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── MessageInput ─────────────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (body: string) => Promise<void>
  onSendMedia?: (file: File, caption?: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  replyingTo?: Message | null
  onCancelReply?: () => void
  contactName?: string
}

export function MessageInput({
  onSend,
  onSendMedia,
  disabled = false,
  placeholder = 'Digite uma mensagem... (Enter para enviar)',
  replyingTo,
  onCancelReply,
  contactName,
}: MessageInputProps) {
  const instanceId = useRef(`msg-input-${Math.random().toString(36).slice(2)}`)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
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

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setPendingFiles((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  async function handleSend() {
    if (disabled || sending) return

    // Send pending files first (one by one), caption goes on the first file
    if (pendingFiles.length > 0 && onSendMedia) {
      setSending(true)
      const caption = message.trim() || undefined
      try {
        for (let i = 0; i < pendingFiles.length; i++) {
          await onSendMedia(pendingFiles[i], i === 0 ? caption : undefined)
        }
        setPendingFiles([])
        setMessage('')
      } finally {
        setSending(false)
      }
      return
    }

    if (!message.trim()) return
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

  const canSend = !disabled && !sending && (!!message.trim() || pendingFiles.length > 0)

  return (
    <div className="border-t border-border p-3">
      {/* Hidden file inputs rendered outside the popover so they survive when popover closes */}
      {attachmentOptions.filter((o) => o.accept !== null).map((opt) => (
        <input
          key={opt.key}
          id={`${instanceId.current}-${opt.key}`}
          type="file"
          accept={opt.accept!}
          multiple
          className="sr-only"
          onChange={handleFileChange}
          disabled={!onSendMedia || disabled}
        />
      ))}
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

      {/* File previews */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {pendingFiles.map((file, idx) => (
            <FilePreview
              key={`${file.name}-${file.size}-${idx}`}
              file={file}
              onRemove={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
            />
          ))}
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
              showAttach ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
              showEmoji ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
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
                {attachmentOptions.map((opt) =>
                  opt.accept !== null ? (
                    <label
                      key={opt.key}
                      htmlFor={`${instanceId.current}-${opt.key}`}
                      onClick={() => setTimeout(() => setShowAttach(false), 0)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-md px-3 py-2 hover:bg-muted/60 transition-colors whitespace-nowrap',
                        onSendMedia ? 'cursor-pointer' : 'opacity-40 cursor-not-allowed pointer-events-none',
                      )}
                    >
                      <opt.icon className={cn('h-4 w-4', opt.color)} />
                      <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    </label>
                  ) : (
                    <button
                      key={opt.key}
                      onClick={() => setShowAttach(false)}
                      disabled
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 whitespace-nowrap opacity-40 cursor-not-allowed"
                    >
                      <opt.icon className={cn('h-4 w-4', opt.color)} />
                      <span className="text-xs font-medium text-foreground">{opt.label}</span>
                    </button>
                  )
                )}
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
          placeholder={pendingFiles.length > 0 ? 'Adicionar legenda... (opcional)' : placeholder}
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
          disabled={!canSend}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
