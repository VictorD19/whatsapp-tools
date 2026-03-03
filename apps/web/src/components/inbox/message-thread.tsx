'use client'

import React, { useCallback, useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useInboxStore, type Conversation } from '@/stores/inbox.store'
import { useConversation } from '@/hooks/use-conversation'
import { useAuthStore } from '@/stores/auth.store'

interface MessageThreadProps {
  conversation: Conversation
}

export function MessageThread({ conversation }: MessageThreadProps) {
  const messages = useInboxStore((s) => s.messages[conversation.id] ?? [])
  const isLoading = useInboxStore((s) => s.isLoadingMessages)
  const { fetchMessages, sendMessage, assignConversation, closeConversation } = useConversation()
  const userId = useAuthStore((s) => s.user?.id)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Fetch messages on conversation select
  useEffect(() => {
    fetchMessages(conversation.id)
  }, [conversation.id, fetchMessages])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = useCallback(
    async (body: string) => {
      await sendMessage(conversation.id, body)
    },
    [conversation.id, sendMessage],
  )

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
        <div className="flex items-center gap-2">
          {isPending && (
            <Button size="sm" onClick={() => assignConversation(conversation.id)}>
              Assumir
            </Button>
          )}
          {conversation.status === 'OPEN' && isAssignedToMe && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => closeConversation(conversation.id)}
            >
              Encerrar
            </Button>
          )}
        </div>
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
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
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
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        disabled={!canSend}
        placeholder={
          isPending
            ? 'Assuma a conversa para responder'
            : !isAssignedToMe
              ? 'Voce nao esta atribuido a esta conversa'
              : 'Digite uma mensagem... (Enter para enviar)'
        }
      />
    </div>
  )
}
