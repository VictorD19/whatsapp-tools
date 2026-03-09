'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, FileText } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Assistant, KnowledgeBase, ApiResponse } from './types'

const MODEL_OPTIONS = [
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
]

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

interface AssistantFormProps {
  assistant?: Assistant | null
  saving: boolean
  onSave: (data: AssistantFormData) => void
}

export function AssistantForm({ assistant, saving, onSave }: AssistantFormProps) {
  const router = useRouter()

  const [name, setName] = useState(assistant?.name ?? '')
  const [description, setDescription] = useState(assistant?.description ?? '')
  const [avatarEmoji, setAvatarEmoji] = useState(assistant?.avatarEmoji ?? '')
  const [model, setModel] = useState(assistant?.model ?? 'claude-sonnet-4-6')
  const [systemPrompt, setSystemPrompt] = useState(assistant?.systemPrompt ?? '')
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(assistant?.waitTimeSeconds ?? 5)
  const [isActive, setIsActive] = useState(assistant?.isActive ?? true)
  const [selectedKBs, setSelectedKBs] = useState<string[]>(
    assistant?.knowledgeBases.map((kb) => kb.knowledgeBaseId) ?? [],
  )

  useEffect(() => {
    if (assistant) {
      setName(assistant.name)
      setDescription(assistant.description ?? '')
      setAvatarEmoji(assistant.avatarEmoji ?? '')
      setModel(assistant.model)
      setSystemPrompt(assistant.systemPrompt)
      setWaitTimeSeconds(assistant.waitTimeSeconds)
      setIsActive(assistant.isActive)
      setSelectedKBs(assistant.knowledgeBases.map((kb) => kb.knowledgeBaseId))
    }
  }, [assistant])

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => apiGet<ApiResponse<KnowledgeBase[]>>('knowledge-bases').then((r) => r.data),
  })

  const toggleKB = useCallback(
    (id: string) =>
      setSelectedKBs((prev) => (prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id])),
    [],
  )

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
      handoffKeywords: [],
      knowledgeBaseIds: selectedKBs,
      aiToolIds: [],
    })
  }, [name, description, avatarEmoji, model, systemPrompt, waitTimeSeconds, isActive, selectedKBs, onSave])

  return (
    <div className="flex flex-col h-full">
      {/* Topbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/assistants')}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Assistentes
          </Button>
          <span className="text-muted-foreground text-sm">/</span>
          <span className="text-sm font-medium">
            {assistant ? assistant.name : 'Novo assistente'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/assistants')}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? 'Salvando...' : assistant ? 'Salvar alterações' : 'Criar assistente'}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-6 pt-1 border-b bg-background">
          <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
            {[
              { value: 'profile', label: 'Perfil', icon: User },
              { value: 'instructions', label: 'Instruções', icon: FileText },
            ].map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 px-4 py-3 text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* PERFIL */}
        <TabsContent value="profile" className="flex-1 overflow-y-auto p-6 mt-0">
          <div className="max-w-xl">
            <div className="rounded-xl border bg-card p-6 space-y-5">
              {/* Avatar + emoji */}
              <div className="flex items-center gap-5 pb-2 border-b">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-primary/10 text-4xl border-2 border-dashed border-primary/30">
                  {avatarEmoji || '🤖'}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emoji" className="text-xs text-muted-foreground">
                    Emoji do avatar
                  </Label>
                  <Input
                    id="emoji"
                    placeholder="🤖"
                    value={avatarEmoji}
                    onChange={(e) => setAvatarEmoji(e.target.value)}
                    className="w-20 text-center text-lg"
                  />
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  placeholder="Ex: SDR de Vendas"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Ex: Ajuda clientes a solucionar dúvidas sobre o nosso sistema"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Modelo */}
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

              {/* Tempo */}
              <div className="space-y-2">
                <Label htmlFor="wait-time">Tempo para coletar mensagens</Label>
                <p className="text-xs text-muted-foreground">
                  O bot aguarda este tempo antes de responder, para juntar mensagens em sequência
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    id="wait-time"
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

              {/* Status */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Status</Label>
                <RadioGroup
                  value={isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setIsActive(v === 'active')}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="active" id="status-active" />
                    <Label htmlFor="status-active" className="font-normal cursor-pointer">
                      Ativo
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="inactive" id="status-inactive" />
                    <Label htmlFor="status-inactive" className="font-normal cursor-pointer">
                      Inativo
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Knowledge Bases */}
              <div className="space-y-2">
                <Label>
                  Bases de conhecimento{' '}
                  <span className="text-muted-foreground font-normal">(opcional)</span>
                </Label>
                {knowledgeBases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhuma base de conhecimento criada.</p>
                ) : (
                  <div className="rounded-lg border divide-y">
                    {knowledgeBases.map((kb) => (
                      <div
                        key={kb.id}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleKB(kb.id)}
                      >
                        <Checkbox
                          id={`kb-${kb.id}`}
                          checked={selectedKBs.includes(kb.id)}
                          onCheckedChange={() => toggleKB(kb.id)}
                        />
                        <Label
                          htmlFor={`kb-${kb.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {kb.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* INSTRUÇÕES */}
        <TabsContent value="instructions" className="flex-1 overflow-y-auto p-6 mt-0">
          <div className="max-w-3xl">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <div>
                <Label htmlFor="prompt">Instruções do sistema</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Descreva o comportamento, tom e objetivos do assistente. Quanto mais detalhado, melhor.
                </p>
              </div>
              <Textarea
                id="prompt"
                placeholder={`Você é um assistente de vendas especializado em...\n\nSeu objetivo é...\n\nSempre responda em português e de forma...\n\nQuando o cliente perguntar sobre preço, você deve...`}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="min-h-[500px] resize-none font-mono text-sm leading-relaxed"
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
