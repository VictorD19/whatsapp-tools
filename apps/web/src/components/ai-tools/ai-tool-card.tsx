'use client'

import React from 'react'
import { Pencil, Trash2, Search, UserPlus, Tag, Briefcase, Handshake, Webhook } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import type { AiTool } from './ai-tool-sheet'
import type { AiToolType } from './tool-type-selector'

const TYPE_META: Record<AiToolType, { icon: React.ElementType; label: string; variant: 'default' | 'secondary' | 'info' | 'success' | 'warning' }> = {
  BUSCAR_CONTATO: { icon: Search, label: 'Buscar Contato', variant: 'info' },
  CRIAR_CONTATO: { icon: UserPlus, label: 'Criar Contato', variant: 'success' },
  ADICIONAR_TAG: { icon: Tag, label: 'Adicionar Tag', variant: 'warning' },
  CRIAR_DEAL: { icon: Briefcase, label: 'Criar Deal', variant: 'default' },
  TRANSFERIR_HUMANO: { icon: Handshake, label: 'Transferir Humano', variant: 'secondary' },
  WEBHOOK_EXTERNO: { icon: Webhook, label: 'Webhook', variant: 'info' },
}

interface AiToolCardProps {
  tool: AiTool
  onEdit: (tool: AiTool) => void
  onDelete: (tool: AiTool) => void
  onToggle: (tool: AiTool, isActive: boolean) => void
}

export function AiToolCard({ tool, onEdit, onDelete, onToggle }: AiToolCardProps) {
  const meta = TYPE_META[tool.type]
  const Icon = meta.icon

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{tool.name}</CardTitle>
              {tool.description && (
                <CardDescription className="mt-0.5 line-clamp-2">{tool.description}</CardDescription>
              )}
            </div>
          </div>
          <Switch
            checked={tool.isActive}
            onCheckedChange={(checked) => onToggle(tool, checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(tool)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => onDelete(tool)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
