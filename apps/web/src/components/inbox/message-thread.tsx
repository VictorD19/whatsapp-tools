'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { Skeleton } from '@/components/ui/skeleton'
import { useInboxStore, type Conversation, type Message } from '@/stores/inbox.store'
import { useConversation } from '@/hooks/use-conversation'
import { useAuthStore } from '@/stores/auth.store'

interface MessageThreadProps {
  conversation: Conversation
}

const EMPTY_MESSAGES: Message[] = []

function formatDateSeparator(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) return 'Hoje'
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function shouldShowDateSeparator(messages: Message[], index: number): boolean {
  if (index === 0) return true
  const current = new Date(messages[index].sentAt).toDateString()
  const previous = new Date(messages[index - 1].sentAt).toDateString()
  return current !== previous
}

export function MessageThread({ conversation }: MessageThreadProps) {
  const messages = useInboxStore((s) => s.messages[conversation.id] ?? EMPTY_MESSAGES)
  const isLoading = useInboxStore((s) => s.isLoadingMessages)
  const replyingTo = useInboxStore((s) => s.replyingTo)
  const setReplyingTo = useInboxStore((s) => s.setReplyingTo)
  const { fetchMessages, sendMessage, syncMessages, sendMedia } = useConversation()
  const userId = useAuthStore((s) => s.user?.id)
  const bottomRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  // Reset pagination and reply state on conversation change
  useEffect(() => {
    setPage(1)
    setHasMore(true)
    setLoadingMore(false)
    setReplyingTo(null)
    fetchMessages(conversation.id, 1).then((meta) => {
      if (meta) {
        setHasMore(meta.page < meta.totalPages)
      }
    })
    // Fire-and-forget sync to catch messages missed while offline
    syncMessages(conversation.id)
  }, [conversation.id, fetchMessages, syncMessages, setReplyingTo])

  // Auto-scroll to bottom on initial load or new messages (only if already near bottom)
  const isInitialLoad = useRef(true)
  useEffect(() => {
    if (isInitialLoad.current && messages.length > 0 && !isLoading) {
      // rAF ensures the DOM finished painting before scrolling
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'instant' })
      })
      isInitialLoad.current = false
      return
    }
    // Scroll to bottom for new messages only if user is near the bottom
    const area = scrollAreaRef.current
    if (area) {
      const isNearBottom = area.scrollHeight - area.scrollTop - area.clientHeight < 120
      if (isNearBottom) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
        })
      }
    }
  }, [messages.length, isLoading])

  // Reset initial load flag when conversation changes
  useEffect(() => {
    isInitialLoad.current = true
  }, [conversation.id])

  // IntersectionObserver for infinite scroll upward
  // Skip until initial scroll-to-bottom is done (isInitialLoad becomes false)
  useEffect(() => {
    if (!hasMore || loadingMore || isLoading || isInitialLoad.current) return

    const sentinel = topSentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1
          setLoadingMore(true)

          // Save scroll position to restore after prepending
          const area = scrollAreaRef.current
          const prevScrollHeight = area?.scrollHeight ?? 0

          fetchMessages(conversation.id, nextPage).then((meta) => {
            setPage(nextPage)
            setLoadingMore(false)
            if (meta) {
              setHasMore(meta.page < meta.totalPages)
            } else {
              setHasMore(false)
            }

            // Restore scroll position after DOM update
            requestAnimationFrame(() => {
              if (area) {
                const newScrollHeight = area.scrollHeight
                area.scrollTop = newScrollHeight - prevScrollHeight
              }
            })
          })
        }
      },
      { root: scrollAreaRef.current, threshold: 0.1 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, isLoading, page, conversation.id, fetchMessages])

  const handleSend = useCallback(
    async (body: string) => {
      const quotedId = useInboxStore.getState().replyingTo?.id
      await sendMessage(conversation.id, body, quotedId)
      setReplyingTo(null)
    },
    [conversation.id, sendMessage, setReplyingTo],
  )

  const handleSendMedia = useCallback(
    async (file: File, caption?: string) => {
      await sendMedia(conversation.id, file, caption)
    },
    [conversation.id, sendMedia],
  )

  const handleReply = useCallback(
    (msg: Message) => {
      setReplyingTo(msg)
    },
    [setReplyingTo],
  )

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null)
  }, [setReplyingTo])

  const isAssignedToMe = conversation.assignedToId === userId
  const canSend = conversation.status === 'OPEN' && isAssignedToMe
  const isPending = conversation.status === 'PENDING'

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold">
            {conversation.contact.name ?? conversation.contact.phone}
          </h3>
          <p className="text-xs text-muted-foreground">{conversation.instance.name}</p>
        </div>
        <div className="flex items-center gap-2" />
      </div>

      {/* Summary banner for escalated conversations */}
      {conversation.summary && conversation.tags.includes('escalonado') && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border-b border-yellow-200 dark:border-yellow-800 px-4 py-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200">
                Resumo da IA
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-0.5">
                {conversation.summary}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollAreaRef} className="relative flex-1 overflow-y-auto p-4 space-y-1 bg-muted/30 scrollbar-none">
        {/* Subtle background pattern */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23888888' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Top sentinel for infinite scroll */}
            <div ref={topSentinelRef} className="h-1" />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}

            {messages.map((msg, idx) => (
              <React.Fragment key={msg.id}>
                {shouldShowDateSeparator(messages, idx) && (
                  <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 border-t border-border" />
                    <span className="text-[10px] text-muted-foreground font-medium px-2">
                      {formatDateSeparator(msg.sentAt)}
                    </span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                )}
                <MessageBubble message={msg} contactName={conversation.contact.name ?? conversation.contact.phone} onReply={canSend ? handleReply : undefined} />
              </React.Fragment>
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onSendMedia={canSend ? handleSendMedia : undefined}
        disabled={!canSend}
        placeholder={
          isPending
            ? 'Assuma a conversa para responder'
            : !isAssignedToMe
              ? 'Voce nao esta atribuido a esta conversa'
              : 'Digite uma mensagem... (Enter para enviar)'
        }
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        contactName={conversation.contact.name ?? conversation.contact.phone}
      />
    </div>
  )
}
