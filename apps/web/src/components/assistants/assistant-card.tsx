'use client'

import React from 'react'
import { Trash2, Bot } from 'lucide-react'
import type { Assistant } from './types'

interface AssistantCardProps {
  assistant: Assistant
  onEdit: (assistant: Assistant) => void
  onDelete: (assistant: Assistant) => void
}

export function AssistantCard({ assistant, onEdit, onDelete }: AssistantCardProps) {
  return (
    <div
      className="group relative flex items-start gap-3 rounded-xl border bg-card p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
      onClick={() => onEdit(assistant)}
    >
      {/* Delete button — aparece no hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(assistant)
        }}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl">
        {assistant.avatarEmoji || <Bot className="h-6 w-6 text-primary" />}
      </div>

      {/* Conteúdo */}
      <div className="min-w-0 flex-1 pr-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold truncate">{assistant.name}</span>
        </div>
        <span className={`text-xs font-medium ${assistant.isActive ? 'text-emerald-600' : 'text-muted-foreground'}`}>
          {assistant.isActive ? 'Ativo' : 'Inativo'}
        </span>
        {assistant.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{assistant.description}</p>
        )}
      </div>
    </div>
  )
}
