'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, FileText, Check, Wrench, Volume2 } from 'lucide-react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor, type SlashCommandItem } from '@/components/ui/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageLayout } from '@/components/layout/page-layout'
import { useTranslations } from 'next-intl'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import type { Assistant, KnowledgeBase, AiTool, ApiResponse } from './types'

const AI_AVATARS = [
  '/ai-avatars/1.png',
  '/ai-avatars/2.png',
  '/ai-avatars/3.png',
  '/ai-avatars/4.png',
]

const DEFAULT_AVATAR = AI_AVATARS[0]

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
  { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
]

const VOICE_OPTIONS = [
  { value: 'pt-BR-FranciscaNeural', label: 'Francisca (PT-BR)', lang: 'pt-BR' },
  { value: 'pt-BR-AntonioNeural', label: 'Antonio (PT-BR)', lang: 'pt-BR' },
  { value: 'pt-BR-ThalitaNeural', label: 'Thalita (PT-BR)', lang: 'pt-BR' },
  { value: 'en-US-AriaNeural', label: 'Aria (EN-US)', lang: 'en-US' },
  { value: 'en-US-GuyNeural', label: 'Guy (EN-US)', lang: 'en-US' },
  { value: 'es-MX-DaliaNeural', label: 'Dalia (ES-MX)', lang: 'es-MX' },
  { value: 'es-MX-JorgeNeural', label: 'Jorge (ES-MX)', lang: 'es-MX' },
]

export interface AssistantFormData {
  name: string
  description: string
  avatarUrl: string
  avatarEmoji: string
  model: string
  systemPrompt: string
  waitTimeSeconds: number
  isActive: boolean
  handoffKeywords: string[]
  knowledgeBaseIds: string[]
  aiToolIds: string[]
  audioResponseMode: 'never' | 'auto' | 'always'
  voiceId: string
}

interface AssistantFormProps {
  assistant?: Assistant | null
  saving: boolean
  onSave: (data: AssistantFormData) => void
}

export function AssistantForm({ assistant, saving, onSave }: AssistantFormProps) {
  const t = useTranslations('assistants')
  const tc = useTranslations('common')
  const router = useRouter()

  const [name, setName] = useState(assistant?.name ?? '')
  const [description, setDescription] = useState(assistant?.description ?? '')
  const [avatarUrl, setAvatarUrl] = useState(assistant?.avatarUrl ?? DEFAULT_AVATAR)
  const [avatarEmoji, setAvatarEmoji] = useState(assistant?.avatarEmoji ?? '')
  const [avatarPopoverOpen, setAvatarPopoverOpen] = useState(false)
  const [model, setModel] = useState(assistant?.model ?? 'gpt-4o-mini')
  const [systemPrompt, setSystemPrompt] = useState(assistant?.systemPrompt ?? '')
  const [waitTimeSeconds, setWaitTimeSeconds] = useState(assistant?.waitTimeSeconds ?? 5)
  const [isActive, setIsActive] = useState(assistant?.isActive ?? true)
  const [audioResponseMode, setAudioResponseMode] = useState<'never' | 'auto' | 'always'>(assistant?.audioResponseMode ?? 'never')
  const [voiceId, setVoiceId] = useState(assistant?.voiceId ?? 'pt-BR-FranciscaNeural')
  const [selectedKBs, setSelectedKBs] = useState<string[]>(
    assistant?.knowledgeBases.map((kb) => kb.knowledgeBaseId) ?? [],
  )

  useEffect(() => {
    if (assistant) {
      setName(assistant.name)
      setDescription(assistant.description ?? '')
      setAvatarUrl(assistant.avatarUrl ?? DEFAULT_AVATAR)
      setAvatarEmoji(assistant.avatarEmoji ?? '')
      setModel(assistant.model)
      setSystemPrompt(assistant.systemPrompt)
      setWaitTimeSeconds(assistant.waitTimeSeconds)
      setIsActive(assistant.isActive)
      setAudioResponseMode(assistant.audioResponseMode ?? 'never')
      setVoiceId(assistant.voiceId ?? 'pt-BR-FranciscaNeural')
      setSelectedKBs(assistant.knowledgeBases.map((kb) => kb.knowledgeBaseId))
    }
  }, [assistant])

  const { data: knowledgeBases = [] } = useQuery({
    queryKey: ['knowledge-bases'],
    queryFn: () => apiGet<ApiResponse<KnowledgeBase[]>>('knowledge-bases').then((r) => r.data),
  })

  const { data: aiTools = [] } = useQuery({
    queryKey: ['ai-tools'],
    queryFn: () => apiGet<ApiResponse<AiTool[]>>('ai-tools').then((r) => r.data),
  })

  const slashCommands: SlashCommandItem[] = React.useMemo(() => {
    if (aiTools.length === 0) return []
    return [
      {
        id: 'tools',
        label: t('slashCommand.tools'),
        description: t('slashCommand.noTools'),
        icon: <Wrench className="h-4 w-4" />,
        items: aiTools.map((tool) => ({
          id: tool.id,
          label: tool.name,
          description: tool.type,
        })),
        onSelect: (item) => `**🔧 ${item.label}** `,
      },
    ]
  }, [aiTools, t])

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
      avatarUrl,
      avatarEmoji: avatarEmoji.trim(),
      model,
      systemPrompt,
      waitTimeSeconds,
      isActive,
      handoffKeywords: [],
      knowledgeBaseIds: selectedKBs,
      aiToolIds: [],
      audioResponseMode,
      voiceId,
    })
  }, [name, description, avatarUrl, avatarEmoji, model, systemPrompt, waitTimeSeconds, isActive, selectedKBs, audioResponseMode, voiceId, onSave])

  return (
    <PageLayout
      breadcrumb={[
        { label: t('aiBreadcrumb') },
        { label: t('breadcrumb') },
        { label: assistant ? assistant.name : t('form.newAssistant') },
      ]}
      cardClassName="flex flex-col overflow-hidden p-0"
    >
      {/* Topbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/assistants')}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('breadcrumb')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/assistants')}>
            {t('form.cancelButton')}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim()}>
            {saving ? t('form.saving') : assistant ? t('form.saveChanges') : t('form.createAssistant')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
        <div className="px-5 pt-1 border-b">
          <TabsList className="bg-transparent p-0 h-auto gap-0 rounded-none">
            {[
              { value: 'profile', label: t('tabs.profile'), icon: User },
              { value: 'instructions', label: t('tabs.instructions'), icon: FileText },
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
        <TabsContent value="profile" className="flex-1 overflow-y-auto p-5 mt-0">
          <div className="max-w-xl">
            <div className="space-y-5">
              {/* Avatar selector */}
              <div className="flex items-center gap-5 pb-2">
                <Popover open={avatarPopoverOpen} onOpenChange={setAvatarPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden cursor-pointer group bg-[#DCDBE0]"
                    >
                      <Image
                        src={avatarUrl}
                        alt="Avatar"
                        fill
                        className="object-cover scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                          {tc('edit')}
                        </span>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-3" align="start">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">
                      {t('fields.chooseAvatar')}
                    </p>
                    <div className="flex gap-2">
                      {AI_AVATARS.map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(src)
                            setAvatarPopoverOpen(false)
                          }}
                          className={`relative h-14 w-14 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                            avatarUrl === src
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/30'
                          }`}
                        >
                          <Image src={src} alt="Avatar option" fill className="object-cover scale-110" />
                          {avatarUrl === src && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{t('fields.avatar')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('fields.avatarHint')}
                  </p>
                </div>
              </div>

              {/* Nome */}
              <div className="space-y-2">
                <Label htmlFor="name">{t('fields.name')}</Label>
                <Input
                  id="name"
                  placeholder={t('fields.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Descrição */}
              <div className="space-y-2">
                <Label htmlFor="description">{t('fields.description')}</Label>
                <Textarea
                  id="description"
                  placeholder={t('fields.descriptionPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Modelo */}
              <div className="space-y-2">
                <Label>{t('fields.model')}</Label>
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
                <Label htmlFor="wait-time">{t('fields.waitTime')}</Label>
                <p className="text-xs text-muted-foreground">
                  {t('fields.waitTimeFormHint')}
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
                  <span className="text-sm text-muted-foreground">{t('fields.seconds')}</span>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">{t('fields.status')}</Label>
                <RadioGroup
                  value={isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setIsActive(v === 'active')}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="active" id="status-active" />
                    <Label htmlFor="status-active" className="font-normal cursor-pointer">
                      {t('fields.active')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="inactive" id="status-inactive" />
                    <Label htmlFor="status-inactive" className="font-normal cursor-pointer">
                      {t('fields.inactive')}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Knowledge Bases */}
              <div className="space-y-2">
                <Label>
                  {t('fields.knowledgeBases')}{' '}
                  <span className="text-muted-foreground font-normal">{t('fields.optional')}</span>
                </Label>
                {knowledgeBases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('fields.noKnowledgeBases')}</p>
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

              {/* Audio Response */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-muted-foreground" />
                  <Label>{t('fields.audioResponse')}</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('fields.audioResponseHint')}
                </p>
                <Select value={audioResponseMode} onValueChange={(v) => setAudioResponseMode(v as 'never' | 'auto' | 'always')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="never">{t('fields.audioNever')}</SelectItem>
                    <SelectItem value="auto">{t('fields.audioAuto')}</SelectItem>
                    <SelectItem value="always">{t('fields.audioAlways')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Voice Selection */}
              {audioResponseMode !== 'never' && (
                <div className="space-y-2">
                  <Label>{t('fields.voice')}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t('fields.voiceHint')}
                  </p>
                  <Select value={voiceId} onValueChange={setVoiceId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((voice) => (
                        <SelectItem key={voice.value} value={voice.value}>
                          {voice.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* INSTRUÇÕES */}
        <TabsContent value="instructions" className="flex-1 overflow-y-auto p-5 mt-0">
          <div className="max-w-3xl">
            <div className="space-y-3">
              <div>
                <Label>{t('fields.systemPrompt')}</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('fields.systemPromptHint')}
                </p>
              </div>
              <RichTextEditor
                value={systemPrompt}
                onChange={setSystemPrompt}
                placeholder={t('fields.systemPromptPlaceholder')}
                slashCommands={slashCommands}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
