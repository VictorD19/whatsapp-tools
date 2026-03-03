'use client'

import React from 'react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'

interface Message {
  id: string
  text: string
  fromMe: boolean
  timestamp: string
  status: 'sent' | 'delivered' | 'read'
}

const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Olá! Gostaria de saber mais sobre o produto',
    fromMe: false,
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    status: 'read',
  },
  {
    id: '2',
    text: 'Olá, Ana! Claro, estou aqui para ajudar. O que você gostaria de saber?',
    fromMe: true,
    timestamp: new Date(Date.now() - 9 * 60 * 1000).toISOString(),
    status: 'read',
  },
  {
    id: '3',
    text: 'Quais são as formas de pagamento disponíveis?',
    fromMe: false,
    timestamp: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    status: 'read',
  },
  {
    id: '4',
    text: 'Aceitamos cartão de crédito (até 12x), Pix e boleto bancário. No Pix você tem 5% de desconto!',
    fromMe: true,
    timestamp: new Date(Date.now() - 7 * 60 * 1000).toISOString(),
    status: 'read',
  },
  {
    id: '5',
    text: 'Ótimo! E o prazo de entrega?',
    fromMe: false,
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    status: 'read',
  },
]

export function MessageThread() {
  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {mockMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
      </div>
      <MessageInput />
    </div>
  )
}
