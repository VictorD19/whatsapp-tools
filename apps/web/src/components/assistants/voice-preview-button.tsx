'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Play, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import { useTranslations } from 'next-intl'

interface VoicePreviewButtonProps {
  voiceId: string
}

export function VoicePreviewButton({ voiceId }: VoicePreviewButtonProps) {
  const t = useTranslations('assistants')
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
    }
  }, [])

  const handlePlay = useCallback(async () => {
    if (state === 'playing') {
      cleanup()
      setState('idle')
      return
    }

    setState('loading')
    try {
      const blob = await api
        .post('assistants/voice-preview', { json: { voiceId } })
        .blob()

      cleanup()

      const url = URL.createObjectURL(blob)
      urlRef.current = url

      const audio = new Audio(url)
      audioRef.current = audio

      audio.onended = () => {
        setState('idle')
        cleanup()
      }

      audio.onerror = () => {
        setState('idle')
        cleanup()
      }

      await audio.play()
      setState('playing')
    } catch {
      setState('idle')
      cleanup()
    }
  }, [voiceId, state, cleanup])

  // Cleanup on unmount
  React.useEffect(() => cleanup, [cleanup])

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handlePlay}
      disabled={state === 'loading'}
      className="gap-1.5"
    >
      {state === 'loading' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {state === 'playing' && <Square className="h-3.5 w-3.5" />}
      {state === 'idle' && <Play className="h-3.5 w-3.5" />}
      {state === 'loading'
        ? t('fields.voiceLoading')
        : state === 'playing'
          ? t('fields.voiceStop')
          : t('fields.voicePreview')}
    </Button>
  )
}
