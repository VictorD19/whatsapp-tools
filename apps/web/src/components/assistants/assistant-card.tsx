'use client'

import React from 'react'
import { Pencil, Trash2, Bot } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Assistant } from './types'

interface AssistantCardProps {
  assistant: Assistant
  onEdit: (assistant: Assistant) => void
  onDelete: (assistant: Assistant) => void
}

export function AssistantCard({ assistant, onEdit, onDelete }: AssistantCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg">
              {assistant.avatarEmoji || <Bot className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-sm">{assistant.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{assistant.model}</CardDescription>
            </div>
          </div>
          <Badge variant={assistant.isActive ? 'success' : 'secondary'}>
            {assistant.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {assistant.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{assistant.description}</p>
        )}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Tempo de espera</span>
          <span className="font-medium">{assistant.waitTimeSeconds}s</span>
        </div>
        {assistant.knowledgeBases.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bases de conhecimento</span>
            <span className="font-medium">{assistant.knowledgeBases.length}</span>
          </div>
        )}
        {assistant.tools.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Ferramentas</span>
            <span className="font-medium">{assistant.tools.length}</span>
          </div>
        )}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit(assistant)}>
            <Pencil className="h-3.5 w-3.5" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(assistant)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
