'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useTranslations } from 'next-intl'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ToolTypeSelector, type AiToolType } from './tool-type-selector'
import { TagConfig } from './config-forms/tag-config'
import { DealConfig } from './config-forms/deal-config'

export interface AiTool {
  id: string
  name: string
  description?: string | null
  type: AiToolType
  config: Record<string, unknown>
  isActive: boolean
  createdAt: string
}

interface AiToolSheetProps {
  open: boolean
  onClose: () => void
  onSave: (data: {
    name: string
    description?: string
    type: AiToolType
    config: Record<string, unknown>
    isActive: boolean
  }) => Promise<void>
  tool?: AiTool | null
  saving?: boolean
}

export function AiToolSheet({ open, onClose, onSave, tool, saving }: AiToolSheetProps) {
  const t = useTranslations('aiTools')
  const tc = useTranslations('common')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<AiToolType | ''>('')
  const [config, setConfig] = useState<Record<string, unknown>>({})
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      if (tool) {
        setName(tool.name)
        setDescription(tool.description ?? '')
        setType(tool.type)
        setConfig(tool.config ?? {})
      } else {
        setName('')
        setDescription('')
        setType('')
        setConfig({})
      }
    }
    wasOpenRef.current = open
  }, [open, tool])

  const handleTypeChange = (newType: AiToolType) => {
    setType(newType)
    setConfig({})
  }

  const handleSubmit = async () => {
    if (!name.trim() || !type) return
    await onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      config,
      isActive: tool?.isActive ?? true,
    })
  }

  const isEditing = !!tool
  const canSubmit = name.trim() && type

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-lg flex flex-col p-0">
        <div className="px-6 pt-6">
          <SheetHeader>
            <SheetTitle>{isEditing ? t('sheet.editTitle') : t('sheet.newTitle')}</SheetTitle>
            <SheetDescription>
              {isEditing ? t('sheet.editDescription') : t('sheet.newDescription')}
            </SheetDescription>
          </SheetHeader>
        </div>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>{t('fields.type')}</Label>
              <ToolTypeSelector
                value={type}
                onChange={handleTypeChange}
                disabled={isEditing}
              />
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label>{t('fields.name')}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('fields.namePlaceholder')}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>{t('fields.description')}</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('fields.descriptionPlaceholder')}
                rows={2}
              />
            </div>

            {/* Config forms */}
            {type === 'ADICIONAR_TAG' && (
              <TagConfig
                value={config as { tagIds: string[] }}
                onChange={setConfig}
              />
            )}
            {type === 'CRIAR_DEAL' && (
              <DealConfig
                value={config as { pipelineId?: string; stageId?: string }}
                onChange={setConfig}
              />
            )}
          </div>
        </ScrollArea>

        <div className="px-6 pb-6">
          <SheetFooter>
            <Button variant="outline" onClick={onClose}>{tc('cancel')}</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
              {saving ? tc('loading') : isEditing ? tc('save') : tc('create')}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
