'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Send, Paperclip, Smile, Image, FileText, Video, AudioLines, X, Music, Mic, Check,
  Play, Pause, Loader2, AtSign,
} from 'lucide-react'
import type { GroupMember } from '@/hooks/use-group-members'
import Picker from '@emoji-mart/react'
import data from '@emoji-mart/data'
import { cn } from '@/lib/utils'
import type { Message } from '@/stores/inbox.store'

// ─── Attachment options ───────────────────────────────────────────────────────

const attachmentOptions = [
  { key: 'image',    icon: Image,      label: 'Imagem',    color: 'text-violet-400', accept: '.jpg,.jpeg,.png' },
  { key: 'video',    icon: Video,      label: 'Vídeo',     color: 'text-blue-400',   accept: '.mp4,.avi,.mov,.3gp' },
  { key: 'audio',    icon: AudioLines, label: 'Áudio gravado', color: 'text-pink-400',   accept: '.mp3,.wav,.ogg' },
  { key: 'document', icon: FileText,   label: 'Documento', color: 'text-orange-400', accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.zip,.rar' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatRecordingTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = (seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
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

/** Returns pushName if available, otherwise the phone number */
function memberDisplayName(member: GroupMember): string {
  if (member.name) return member.name
  if (member.phone) return member.phone
  return member.id.split('@')[0]
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
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name)
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|3gp|mkv|webm)$/i.test(file.name)
  const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i.test(file.name)

  useEffect(() => {
    if (isImage || isAudio) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => URL.revokeObjectURL(url)
    }
  }, [file, isImage, isAudio])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
  }

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
          {/* hidden audio element */}
          <audio
            ref={audioRef}
            src={previewUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Play / Pause button */}
          <button
            onClick={togglePlay}
            className="shrink-0 h-9 w-9 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center transition-colors"
          >
            {isPlaying
              ? <Pause className="h-4 w-4 text-primary" />
              : <Play className="h-4 w-4 text-primary translate-x-px" />
            }
          </button>

          {/* waveform bars */}
          <div className="flex items-center gap-[2px] flex-1 h-8">
            {waveform.map((h, i) => (
              <div
                key={i}
                className={cn('w-[3px] rounded-full transition-colors', isPlaying ? 'bg-primary' : 'bg-primary/40')}
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

// ─── RecordingBar ──────────────────────────────────────────────────────────────

const BAR_COUNT = 28

interface RecordingBarProps {
  seconds: number
  analyser: AnalyserNode | null
  onCancel: () => void
  onConfirm: () => void
}

function RecordingBar({ seconds, analyser, onCancel, onConfirm }: RecordingBarProps) {
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(8))
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (!analyser) return
    const data = new Uint8Array(analyser.frequencyBinCount)
    const step = Math.floor(analyser.frequencyBinCount / BAR_COUNT)

    function tick() {
      analyser.getByteFrequencyData(data)
      setBars(Array.from({ length: BAR_COUNT }, (_, i) => {
        const val = data[i * step] / 255
        return 8 + Math.round(val * 82) // 8–90 %
      }))
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [analyser])

  return (
    <div className="flex-1 flex items-center gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      {/* Cancel */}
      <button
        onClick={onCancel}
        className="shrink-0 text-muted-foreground hover:text-destructive transition-colors mb-1"
        title="Cancelar gravação"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Dot + live waveform + timer */}
      <div className="flex-1 flex items-center gap-2.5 min-w-0">
        {/* Pulsing red dot */}
        <span className="shrink-0 relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>

        {/* Live waveform bars */}
        <div className="flex items-end gap-[2px] flex-1 h-7">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-[3px] rounded-full bg-red-400/80 transition-none"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>

        {/* Timer */}
        <span className="shrink-0 text-xs font-mono text-red-400 tabular-nums">
          {formatRecordingTime(seconds)}
        </span>
      </div>

      {/* Confirm */}
      <button
        onClick={onConfirm}
        className="shrink-0 text-muted-foreground hover:text-emerald-400 transition-colors mb-1"
        title="Confirmar gravação"
      >
        <Check className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── MessageInput ─────────────────────────────────────────────────────────────

interface MessageInputProps {
  onSend: (body: string, mentions?: string[]) => Promise<void>
  onSendMedia?: (file: File, caption?: string) => Promise<void>
  disabled?: boolean
  placeholder?: string
  replyingTo?: Message | null
  onCancelReply?: () => void
  contactName?: string
  isGroup?: boolean
  groupMembers?: GroupMember[]
  loadingMembers?: boolean
}

export function MessageInput({
  onSend,
  onSendMedia,
  disabled = false,
  placeholder = 'Digite uma mensagem... (Enter para enviar)',
  replyingTo,
  onCancelReply,
  contactName,
  isGroup = false,
  groupMembers = [],
  loadingMembers = false,
}: MessageInputProps) {
  const instanceId = useRef(`msg-input-${Math.random().toString(36).slice(2)}`)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showAttach, setShowAttach] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [showMention, setShowMention] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [trackedMentions, setTrackedMentions] = useState<{ jid: string; name: string }[]>([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const mentionRef = useRef<HTMLDivElement>(null)

  // ── Recording state ──
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<BlobPart[]>([])
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

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
      if (
        showMention &&
        mentionRef.current &&
        !mentionRef.current.contains(e.target as Node)
      ) {
        setShowMention(false)
      }
    }
    if (showEmoji || showAttach || showMention) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEmoji, showAttach, showMention])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
      audioContextRef.current?.close()
    }
  }, [])

  function handleEmojiSelect(emoji: { native: string }) {
    setMessage((prev) => prev + emoji.native)
    textareaRef.current?.focus()
  }

  function handleMessageChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setMessage(val)

    if (!isGroup) {
      setShowMention(false)
      return
    }

    // Find the last '@' that starts a mention (not inside brackets)
    const cursorPos = e.target.selectionStart ?? val.length
    const textUpToCursor = val.slice(0, cursorPos)
    const lastAtIdx = textUpToCursor.lastIndexOf('@')

    if (lastAtIdx >= 0) {
      // Check the char before @ is space/start-of-text (word boundary)
      const charBefore = lastAtIdx > 0 ? textUpToCursor[lastAtIdx - 1] : ' '
      if (charBefore === ' ' || charBefore === '\n' || lastAtIdx === 0) {
        const filterText = textUpToCursor.slice(lastAtIdx + 1)
        // Only show if no space yet in filter (still typing a name)
        if (!filterText.includes(' ') && !filterText.includes('[') && !filterText.includes(']')) {
          setMentionFilter(filterText.toLowerCase())
          setShowMention(true)
          setMentionIndex(0)
          return
        }
      }
    }

    setShowMention(false)
  }

  // Compute filtered members list for dropdown
  const filteredMembers = groupMembers.filter((m) => {
    const name = memberDisplayName(m).toLowerCase()
    return name.includes(mentionFilter)
  })

  function insertMention(member: GroupMember) {
    const cursorPos = textareaRef.current?.selectionStart ?? message.length
    const textUpToCursor = message.slice(0, cursorPos)
    const lastAtIdx = textUpToCursor.lastIndexOf('@')
    if (lastAtIdx < 0) return

    const displayName = memberDisplayName(member)
    const before = message.slice(0, lastAtIdx)
    const after = message.slice(cursorPos)
    const newMessage = `${before}@[${displayName}] ${after}`
    setMessage(newMessage)
    setTrackedMentions((prev) => {
      if (prev.some((m) => m.jid === member.id)) return prev
      return [...prev, { jid: member.id, name: displayName }]
    })
    setShowMention(false)
    textareaRef.current?.focus()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setPendingFiles((prev) => [...prev, ...Array.from(files)])
    e.target.value = ''
  }

  async function startRecording() {
    if (disabled) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Web Audio API — live waveform
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      ctx.createMediaStreamSource(stream).connect(analyser)
      audioContextRef.current = ctx
      setAnalyserNode(analyser)

      const mr = new MediaRecorder(stream)
      audioChunksRef.current = []
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000,
      )
    } catch {
      // permission denied or no device — silently ignore
    }
  }

  function cancelRecording() {
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    mediaRecorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
    mediaRecorderRef.current = null
    audioChunksRef.current = []
    audioContextRef.current?.close()
    audioContextRef.current = null
    setAnalyserNode(null)
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  function confirmRecording() {
    const mr = mediaRecorderRef.current
    if (!mr) return
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
    mr.onstop = () => {
      const mimeType = mr.mimeType || 'audio/ogg; codecs=opus'
      const blob = new Blob(audioChunksRef.current, { type: mimeType })
      const ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('mp4') ? 'mp4' : 'ogg'
      const file = new File([blob], `audio-${Date.now()}.${ext}`, { type: blob.type })
      setPendingFiles((prev) => [...prev, file])
      audioChunksRef.current = []
    }
    mr.stop()
    mr.stream?.getTracks().forEach((t) => t.stop())
    mediaRecorderRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
    setAnalyserNode(null)
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  async function handleSend() {
    if (disabled || sending) return

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
      // If message contains @todos, auto-add all group members as mentions
      let mentions: string[] | undefined
      const hasAtTodos = message.includes('@todos')
      if (hasAtTodos && isGroup && groupMembers.length > 0) {
        mentions = groupMembers.map((m) => m.id)
      } else if (trackedMentions.length > 0) {
        mentions = trackedMentions.map((m) => m.jid)
      }
      await onSend(message.trim(), mentions)
      setMessage('')
      setTrackedMentions([])
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
      {/* Hidden file inputs */}
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
          disabled && 'opacity-50',
          isRecording && 'border-red-500/40 bg-red-500/5',
        )}
      >
        {/* Attachments + Emoji — hidden while recording */}
        {!isRecording && (
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
        )}

        {/* Textarea OR RecordingBar */}
        {isRecording ? (
          <RecordingBar
            seconds={recordingSeconds}
            analyser={analyserNode}
            onCancel={cancelRecording}
            onConfirm={confirmRecording}
          />
        ) : (
          <div className="relative flex-1">
            {/* Mention dropdown */}
            {showMention && (
              <div
                ref={mentionRef}
                className="absolute bottom-full mb-1 left-0 z-50 rounded-lg border border-border bg-popover shadow-xl overflow-hidden max-h-48 overflow-y-auto min-w-[200px]"
              >
                {loadingMembers ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Carregando membros...</span>
                  </div>
                ) : (
                  <>
                    {/* Individual members */}
                    {filteredMembers.map((member, idx) => (
                      <button
                        key={member.id}
                        onMouseDown={(e) => { e.preventDefault(); insertMention(member) }}
                        className={cn(
                          'flex items-center gap-2.5 px-3 py-2 hover:bg-muted/60 transition-colors w-full text-left',
                          mentionIndex === idx && 'bg-muted/40',
                        )}
                      >
                        <AtSign className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-medium truncate">
                          {memberDisplayName(member)}
                        </span>
                        {member.admin && (
                          <span className="text-[9px] text-emerald-500 font-medium ml-auto shrink-0">Admin</span>
                        )}
                      </button>
                    ))}

                    {filteredMembers.length === 0 && mentionFilter && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Nenhum membro encontrado
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleMessageChange}
              onKeyDown={handleKeyDown}
              placeholder={pendingFiles.length > 0 ? 'Adicionar legenda... (opcional)' : placeholder}
              rows={1}
              disabled={disabled}
              className={cn(
                'w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground',
                'max-h-32 scrollbar-none disabled:cursor-not-allowed'
              )}
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement
                target.style.height = 'auto'
                target.style.height = Math.min(target.scrollHeight, 128) + 'px'
              }}
            />
          </div>
        )}

        {/* Mic button (shown when not recording) */}
        {!isRecording && (
          <button
            className="mb-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={startRecording}
            disabled={disabled}
            title="Gravar áudio"
          >
            <Mic className="h-4 w-4" />
          </button>
        )}

        {/* Send */}
        <button
          className="mb-1 text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={isRecording || !canSend}
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
