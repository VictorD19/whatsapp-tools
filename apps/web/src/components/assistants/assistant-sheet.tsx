'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Assistant, KnowledgeBase, AiTool, ApiResponse } from './types'

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
]

interface AssistantSheetProps {
  open: boolean
  assistant: Assistant | null
  saving: boolean
  onClose: () => void
  onSave: (data: AssistantFormData) => void
}

export interface AssistantFormData {
  name: string
  description: string
  avatarEmoji: string
  model: string
  systemPrompt: string
  waitTimeSeconds: number
  isActive: boolean
  handoffKeywords: string[]
  knowledgeBaseIds: string[]
  aiToolIds: string[]
}

export function AssistantSheet({ open, assistant, saving, onClose, onSave }: AssistantSheetProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('')
  const [model, setModel] = useState('claude-sonnet-4-6')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(5)
  const [isActive, setIsActive] = useState(true)
  const [handoffKeywords, setHandoffKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [selectedKBs, setSelectedKBs] = useState<string[]>([])
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => apiGet<ApiResponse<KnowledgeBase[]>>('knowledge-bases').then((r) => r.data),
    enabled: open,
  })

  const { data: aiTools = [] } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: () => apiGet<ApiResponse<AiTool[]>>('ai-tools').then((r) => r.data),
    enabled: open,
  })

  useEffect(() => {
    if (open) {
      if (assistant) {
        setName(assistant.name)
        setDescription(assistant.description ?? '')
        setAvatarEmoji(assistant.avatarEmoji ?? '')
        setModel(assistant.model)
        setSystemPrompt(assistant.systemPrompt)
        setWaitTimeSeconds(assistant.waitTimeSeconds)
        setIsActive(assistant.isActive)
        setHandoffKeywords(assistant.handoffKeywords)
        setSelectedKBs(assistant.knowledgeBases.map((kb) => kb.knowledgeBaseId))
        setSelectedTools(assistant.tools.map((t) => t.aiToolId))
      } else {
        setName('')
        setDescription('')
        setAvatarEmoji('')
        setModel('claude-sonnet-4-6')
        setSystemPrompt('')
        setWaitTimeSeconds(5)
        setIsActive(true)
        setHandoffKeywords([])
        setSelectedKBs([])
        setSelectedTools([])
      }
      setKeywordInput('')
    }
  }, [open, assistant])

  const handleKeywordKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        const value = keywordInput.trim()
        if (value && !handoffKeywords.includes(value)) {
          setHandoffKeywords((prev) => [...prev, value])
        }
        setKeywordInput('')
      }
    },
    [keywordInput, handoffKeywords],
  )

  const removeKeyword = useCallback((keyword: string) => {
    setHandoffKeywords((prev) => prev.filter((k) => k !== keyword))
  }, [])

  const toggleKB = useCallback((id: string) => {
    setSelectedKBs((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]))
  }, [])

  const toggleTool = useCallback((id: string) => {
    setSelectedTools((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }, [])

  const handleSubmit = useCallback(() => {
    if (!name.trim()) return
    onSave({
      name: name.trim(),
      description: description.trim(),
      avatarEmoji: avatarEmoji.trim(),
      model,
      systemPrompt,
      waitTimeSeconds,
      isActive,
      handoffKeywords,
      knowledgeBaseIds: selectedKBs,
      aiToolIds: selectedTools,
    })
  }, [name, description, avatarEmoji, model, systemPrompt, waitTimeSeconds, isActive, handoffKeywords, selectedKBs, selectedTools, onSave])

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{assistant ? 'Editar assistente' : 'Novo assistente'}</SheetTitle>
          <SheetDescription>
            {assistant ? 'Altere as configuracoes do assistente' : 'Configure um novo assistente de IA'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="assistant-name">Nome *</Label>
            <Input
              id="assistant-name"
              placeholder="Ex: SDR de Vendas"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="assistant-desc">Descricao</Label>
            <Input
              id="assistant-desc"
              placeholder="Breve descricao do assistente"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Avatar Emoji */}
          <div className="space-y-2">
            <Label htmlFor="assistant-emoji">Emoji do avatar</Label>
            <Input
              id="assistant-emoji"
              placeholder="Ex: \uD83E\uDD16"
              value={avatarEmoji}
              onChange={(e) => setAvatarEmoji(e.target.value)}
              className="w-20"
            />
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label>Modelo</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Wait Time */}
          <div className="space-y-2">
            <Label htmlFor="assistant-wait">Tempo de espera (segundos)</Label>
            <Input
              id="assistant-wait"
              type="number"
              min={1}
              max={60}
              value={waitTimeSeconds}
              onChange={(e) => setWaitTimeSeconds(Number(e.target.value))}
              className="w-24"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="assistant-active">Ativo</Label>
            <Switch
              id="assistant-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="assistant-prompt">Prompt do sistema</Label>
            <Textarea
              id="assistant-prompt"
              placeholder="Voce e um assistente de vendas..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
            />
          </div>

          {/* Handoff Keywords */}
          <div className="space-y-2">
            <Label htmlFor="assistant-keywords">Palavras de transferencia</Label>
            <Input
              id="assistant-keywords"
              placeholder="Digite e pressione Enter"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordKeyDown}
            />
            {handoffKeywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {handoffKeywords.map((kw) => (
                  <Badge key={kw} variant="secondary" className="gap-1">
                    {kw}
                    <button type="button" onClick={() => removeKeyword(kw)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Knowledge Bases */}
          {knowledgeBases.length > 0 && (
            <div className="space-y-2">
              <Label>Bases de conhecimento</Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-md border p-2">
                {knowledgeBases.map((kb) => (
                  <label key={kb.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedKBs.includes(kb.id)}
                      onChange={() => toggleKB(kb.id)}
                      className="rounded border-border"
                    />
                    {kb.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* AI Tools */}
          {aiTools.length > 0 && (
            <div className="space-y-2">
              <Label>Ferramentas</Label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto rounded-md border p-2">
                {aiTools.map((tool) => (
                  <label key={tool.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTools.includes(tool.id)}
                      onChange={() => toggleTool(tool.id)}
                      className="rounded border-border"
                    />
                    {tool.name}
                    <span className="text-muted-foreground text-xs">({tool.type})</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : assistant ? 'Salvar' : 'Criar'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
