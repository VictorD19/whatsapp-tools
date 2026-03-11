'use client'

import React, { useEffect, useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getMediaUrl, downloadMedia } from '@/lib/media'

export interface MediaLightboxItem {
  messageId: string
  type: 'IMAGE' | 'VIDEO'
  caption?: string | null
}

interface MediaLightboxProps {
  items: MediaLightboxItem[]
  initialIndex: number
  onClose: () => void
}

export function MediaLightbox({ items, initialIndex, onClose }: MediaLightboxProps) {
  const t = useTranslations('inbox.lightbox')
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const current = items[currentIndex]

  const goNext = useCallback(() => {
    setCurrentIndex((i) => (i + 1) % items.length)
  }, [items.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((i) => (i - 1 + items.length) % items.length)
  }, [items.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, goNext, goPrev])

  if (!current) return null

  const mediaUrl = getMediaUrl(current.messageId)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      {/* Top bar */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-white/80 text-sm font-medium">
          {t('counter', { current: currentIndex + 1, total: items.length })}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => downloadMedia(current.messageId, `media-${current.messageId}`)}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            title={t('download')}
          >
            <Download className="h-5 w-5" />
          </button>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            title={t('close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Prev arrow */}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          title={t('previous')}
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      {/* Media content */}
      <div
        className="max-w-[90vw] max-h-[85vh] flex flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {current.type === 'IMAGE' ? (
          <img
            src={mediaUrl}
            alt={current.caption ?? 'Imagem'}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        ) : (
          <video
            src={mediaUrl}
            controls
            autoPlay
            className="max-w-full max-h-[80vh] rounded-lg"
          />
        )}
        {current.caption && (
          <p className="text-white/80 text-sm text-center max-w-[80vw] px-4">
            {current.caption}
          </p>
        )}
      </div>

      {/* Next arrow */}
      {items.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
          title={t('next')}
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {/* Dot indicators */}
      {items.length > 1 && items.length <= 30 && (
        <div
          className="absolute bottom-4 inset-x-0 flex justify-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                'rounded-full transition-all',
                i === currentIndex
                  ? 'w-4 h-2 bg-white'
                  : 'w-2 h-2 bg-white/40 hover:bg-white/60',
              )}
            />
          ))}
        </div>
      )}
    </div>
  )
}
