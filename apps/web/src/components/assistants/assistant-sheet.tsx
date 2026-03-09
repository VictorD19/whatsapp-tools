'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { X, User, FileText, Settings2 } from 'lucide-react'
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

type Tab = 'profile' | 'instructions' | 'advanced'

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
  const [activeTab, setActiveTab] = useState<Tab>('profile')
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
      setActiveTab('profile')
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

  const tabs = [
    { id: 'profile' as Tab, label: 'Perfil', icon: User },
    { id: 'instructions' as Tab, label: 'Instruções', icon: FileText },
    { id: 'advanced' as Tab, label: 'Avançado', icon: Settings2 },
  ]

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-0">
          <SheetTitle>{assistant ? 'Editar assistente' : 'Novo assistente'}</SheetTitle>
          <SheetDescription>
            {assistant ? 'Altere as configurações do assistente' : 'Configure um novo assistente de IA'}
          </SheetDescription>
        </SheetHeader>

        {/* Tabs */}
        <div className="flex gap-1 px-6 mt-4 border-b">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* PERFIL */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              {/* Avatar Emoji + Name */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-3xl border-2 border-dashed border-primary/30">
                  {avatarEmoji || '🤖'}
                </div>
                <div className="flex-1 space-y-1">
                  <Label htmlFor="assistant-emoji" className="text-xs text-muted-foreground">
                    Emoji do avatar
                  </Label>
                  <Input
                    id="assistant-emoji"
                    placeholder="🤖"
                    value={avatarEmoji}
                    onChange={(e) => setAvatarEmoji(e.target.value)}
                    className="w-20 text-center text-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assistant-name">Nome *</Label>
                <Input
                  id="assistant-name"
                  placeholder="Ex: SDR de Vendas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="assistant-desc">Descrição</Label>
                <Textarea
                  id="assistant-desc"
                  placeholder="Ex: Ajuda clientes a solucionar dúvidas sobre o nosso sistema"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Status */}
              <div className="rounded-lg border p-4 space-y-3">
                <Label className="text-sm font-medium">Status</Label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={isActive}
                      onChange={() => setIsActive(true)}
                      className="text-primary"
                    />
                    <span className="text-sm">Ativo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={!isActive}
                      onChange={() => setIsActive(false)}
                      className="text-primary"
                    />
                    <span className="text-sm">Inativo</span>
                  </label>
                </div>
              </div>

              {/* Knowledge Bases */}
              {knowledgeBases.length > 0 && (
                <div className="space-y-2">
                  <Label>
                    Bases de conhecimento{' '}
                    <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <div className="rounded-lg border divide-y">
                    {knowledgeBases.map((kb) => (
                      <label
                        key={kb.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedKBs.includes(kb.id)}
                          onChange={() => toggleKB(kb.id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm">{kb.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* INSTRUÇÕES */}
          {activeTab === 'instructions' && (
            <div className="space-y-2 h-full">
              <Label htmlFor="assistant-prompt">Instruções do sistema</Label>
              <p className="text-xs text-muted-foreground">
                Descreva o comportamento, tom e objetivos do assistente
              </p>
              <Textarea
                id="assistant-prompt"
                placeholder="Você é um assistente de vendas especializado em... Seu objetivo é... Sempre responda em..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={16}
                className="resize-none font-mono text-sm"
              />
            </div>
          )}

          {/* AVANÇADO */}
          {activeTab === 'advanced' && (
            <div className="space-y-5">
              {/* Model */}
              <div className="space-y-2">
                <Label>Modelo de inteligência</Label>
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
                <Label htmlFor="assistant-wait">
                  Tempo para coletar mensagens
                  <span className="text-muted-foreground font-normal ml-1 text-xs">
                    (aguarda antes de responder)
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="assistant-wait"
                    type="number"
                    min={1}
                    max={60}
                    value={waitTimeSeconds}
                    onChange={(e) => setWaitTimeSeconds(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">segundos</span>
                </div>
              </div>

              {/* Handoff Keywords */}
              <div className="space-y-2">
                <Label htmlFor="assistant-keywords">Palavras de transferência</Label>
                <p className="text-xs text-muted-foreground">
                  Quando o cliente digitar estas palavras, o bot transfere para um atendente
                </p>
                <Input
                  id="assistant-keywords"
                  placeholder="Ex: humano, atendente — pressione Enter"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                />
                {handoffKeywords.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {handoffKeywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="gap-1">
                        {kw}
                        <button
                          type="button"
                          onClick={() => removeKeyword(kw)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Tools */}
              {aiTools.length > 0 && (
                <div className="space-y-2">
                  <Label>Ferramentas</Label>
                  <div className="rounded-lg border divide-y">
                    {aiTools.map((tool) => (
                      <label
                        key={tool.id}
                        className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(tool.id)}
                          onChange={() => toggleTool(tool.id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm flex-1">{tool.name}</span>
                        <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 rounded">
                          {tool.type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t">
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
