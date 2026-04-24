'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, FileText, Check, Wrench, Volume2, Clock, Plus, Pencil, Trash2 } from 'lucide-react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
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
import { VoicePreviewButton } from './voice-preview-button'
import type { Assistant, KnowledgeBase, AiTool, ApiResponse, InactivityRule } from './types'

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
  inactivityFlowRules: InactivityRule[]
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
  const [inactivityRules, setInactivityRules] = useState<InactivityRule[]>(
    assistant?.inactivityFlowRules ?? [],
  )
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const [ruleModalOpen, setRuleModalOpen] = useState(false)
  const [modalRule, setModalRule] = useState<InactivityRule>({
    timeInSeconds: 1800,
    actionType: 'interact',
    message: '',
    allowExecutionAnyTime: true,
  })

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
      setInactivityRules(assistant.inactivityFlowRules ?? [])
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
      inactivityFlowRules: inactivityRules,
    })
  }, [name, description, avatarUrl, avatarEmoji, model, systemPrompt, waitTimeSeconds, isActive, selectedKBs, audioResponseMode, voiceId, inactivityRules, onSave])

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
              { value: 'inactivity', label: t('inactivity.tab'), icon: Clock },
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
                  <div className="flex items-center gap-2">
                    <Select value={voiceId} onValueChange={setVoiceId}>
                      <SelectTrigger className="flex-1">
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
                    <VoicePreviewButton voiceId={voiceId} />
                  </div>
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

        {/* INATIVIDADE */}
        <TabsContent value="inactivity" className="flex-1 overflow-y-auto p-5 mt-0">
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="space-y-1">
                <h3 className="text-sm font-medium">{t('inactivity.title')}</h3>
                <p className="text-xs text-muted-foreground">{t('inactivity.description')}</p>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setModalRule({ timeInSeconds: 1800, actionType: 'interact', message: '', allowExecutionAnyTime: true })
                  setEditingRuleIndex(null)
                  setRuleModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                {t('inactivity.addStep')}
              </Button>
            </div>

            {inactivityRules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t('inactivity.empty')}</p>
                <p className="text-xs mt-1">{t('inactivity.emptyHint')}</p>
              </div>
            ) : (
              <div className="rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t('inactivity.tableStep')}</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t('inactivity.tableTime')}</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t('inactivity.action')}</th>
                      <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">{t('inactivity.businessHoursShort')}</th>
                      <th className="w-20 px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {inactivityRules.map((rule, index) => (
                      <tr key={index} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{index + 1}</td>
                        <td className="px-4 py-3">{Math.round(rule.timeInSeconds / 60)} {t('inactivity.minutes')}</td>
                        <td className="px-4 py-3">
                          {rule.actionType === 'interact' ? t('inactivity.actionInteract') : t('inactivity.actionClose')}
                        </td>
                        <td className="px-4 py-3">
                          {rule.allowExecutionAnyTime ? t('inactivity.anyTime') : t('inactivity.businessOnly')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => {
                                setModalRule({ ...rule })
                                setEditingRuleIndex(index)
                                setRuleModalOpen(true)
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              onClick={() => {
                                setInactivityRules((prev) => prev.filter((_, i) => i !== index))
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal de criar/editar regra */}
          <Dialog open={ruleModalOpen} onOpenChange={(v) => !v && setRuleModalOpen(false)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingRuleIndex !== null ? t('inactivity.editStep') : t('inactivity.addStep')}
                </DialogTitle>
                <DialogDescription>{t('inactivity.modalDescription')}</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground shrink-0">{t('inactivity.after')}</span>
                  <Input
                    type="number"
                    min={1}
                    value={Math.round(modalRule.timeInSeconds / 60)}
                    onChange={(e) => {
                      const minutes = Number(e.target.value)
                      if (minutes < 1) return
                      setModalRule((prev) => ({ ...prev, timeInSeconds: minutes * 60 }))
                    }}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">{t('inactivity.minutes')}</span>
                </div>

                <div className="space-y-1.5">
                  <Label>{t('inactivity.action')}</Label>
                  <Select
                    value={modalRule.actionType}
                    onValueChange={(v) => setModalRule((prev) => ({ ...prev, actionType: v as 'interact' | 'close' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interact">{t('inactivity.actionInteract')}</SelectItem>
                      <SelectItem value="close">{t('inactivity.actionClose')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {modalRule.actionType === 'interact' && (
                  <div className="space-y-1.5">
                    <Label>{t('inactivity.message')}</Label>
                    <Textarea
                      value={modalRule.message ?? ''}
                      onChange={(e) => setModalRule((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder={t('inactivity.messagePlaceholder')}
                      rows={3}
                    />
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="modal-business-hours"
                    checked={!modalRule.allowExecutionAnyTime}
                    onCheckedChange={(checked) => {
                      setModalRule((prev) => ({ ...prev, allowExecutionAnyTime: !checked }))
                    }}
                  />
                  <Label htmlFor="modal-business-hours" className="text-sm font-normal cursor-pointer">
                    {t('inactivity.businessHours')}
                  </Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRuleModalOpen(false)}>
                  {tc('cancel')}
                </Button>
                <Button
                  onClick={() => {
                    if (editingRuleIndex !== null) {
                      setInactivityRules((prev) =>
                        prev.map((r, i) => (i === editingRuleIndex ? modalRule : r)),
                      )
                    } else {
                      setInactivityRules((prev) => [...prev, modalRule])
                    }
                    setRuleModalOpen(false)
                  }}
                  disabled={modalRule.actionType === 'interact' && !modalRule.message?.trim()}
                >
                  {editingRuleIndex !== null ? tc('save') : t('inactivity.addStep')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </PageLayout>
  )
}
