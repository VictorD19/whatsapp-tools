'use client'

import React from 'react'
import { Type, ImageIcon, VideoIcon, FileAudio, FileText, Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import type { BroadcastMessageType } from '@/hooks/use-broadcasts'

interface StepMessageContentProps {
  messageType: BroadcastMessageType
  messageTexts: string[]
  mediaUrl: string
  caption: string
  fileName: string
  onMessageTypeChange: (type: BroadcastMessageType) => void
  onMessageTextsChange: (texts: string[]) => void
  onMediaUrlChange: (url: string) => void
  onCaptionChange: (caption: string) => void
  onFileNameChange: (name: string) => void
}

const messageTypes: Array<{
  type: BroadcastMessageType
  label: string
  icon: React.ElementType
}> = [
  { type: 'TEXT', label: 'Texto', icon: Type },
  { type: 'IMAGE', label: 'Imagem', icon: ImageIcon },
  { type: 'VIDEO', label: 'Video', icon: VideoIcon },
  { type: 'AUDIO', label: 'Audio', icon: FileAudio },
  { type: 'DOCUMENT', label: 'Documento', icon: FileText },
]

export function StepMessageContent({
  messageType,
  messageTexts,
  mediaUrl,
  caption,
  fileName,
  onMessageTypeChange,
  onMessageTextsChange,
  onMediaUrlChange,
  onCaptionChange,
  onFileNameChange,
}: StepMessageContentProps) {
  const updateText = (index: number, value: string) => {
    const updated = [...messageTexts]
    updated[index] = value
    onMessageTextsChange(updated)
  }

  const addVariation = () => {
    onMessageTextsChange([...messageTexts, ''])
  }

  const removeVariation = (index: number) => {
    if (messageTexts.length <= 1) return
    onMessageTextsChange(messageTexts.filter((_, i) => i !== index))
  }

  const insertVariable = (index: number, variable: string) => {
    const updated = [...messageTexts]
    updated[index] = (updated[index] ?? '') + `{{${variable}}}`
    onMessageTextsChange(updated)
  }

  // Pick first non-empty text for preview
  const previewText = messageTexts.find((t) => t.trim().length > 0) ?? ''

  return (
    <div className="space-y-5">
      {/* Message type selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de mensagem</Label>
        <div className="flex gap-1.5">
          {messageTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => onMessageTypeChange(type)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                messageType === type
                  ? 'bg-primary-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Message variations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">
              Variacoes de mensagem
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Adicione multiplas variacoes para evitar deteccao de bot. Uma variacao sera escolhida aleatoriamente para cada destinatario.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariation}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Variacao
          </Button>
        </div>

        {messageTexts.map((text, index) => (
          <div key={index} className="space-y-1.5 rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Variacao {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => insertVariable(index, 'nome')}
                >
                  {'{{nome}}'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => insertVariable(index, 'telefone')}
                >
                  {'{{telefone}}'}
                </Button>
                {messageTexts.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeVariation(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
            <Textarea
              value={text}
              onChange={(e) => updateText(index, e.target.value)}
              placeholder={`Variacao ${index + 1} da mensagem...`}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {text.length}/4096
            </p>
          </div>
        ))}
      </div>

      {/* Media URL (for non-text types) */}
      {messageType !== 'TEXT' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">URL da midia</Label>
          <Input
            value={mediaUrl}
            onChange={(e) => onMediaUrlChange(e.target.value)}
            placeholder="https://exemplo.com/arquivo.jpg"
          />
          <p className="text-xs text-muted-foreground">
            Insira a URL publica do arquivo de midia
          </p>
        </div>
      )}

      {/* Caption (for image/video/document) */}
      {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(messageType) && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Legenda (opcional)</Label>
          <Input
            value={caption}
            onChange={(e) => onCaptionChange(e.target.value)}
            placeholder="Legenda do arquivo..."
          />
        </div>
      )}

      {/* File name (for document) */}
      {messageType === 'DOCUMENT' && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Nome do arquivo</Label>
          <Input
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            placeholder="contrato.pdf"
          />
        </div>
      )}

      {/* Preview */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-muted-foreground">
          Preview (variacao 1)
        </Label>
        <div className="rounded-lg bg-muted/50 p-4">
          <div className="max-w-[280px]">
            <div className="rounded-lg bg-[#dcf8c6] dark:bg-[#005c4b] p-3 text-sm shadow-sm">
              {messageType !== 'TEXT' && mediaUrl && (
                <div className="mb-2 rounded bg-muted/50 p-2 text-xs text-muted-foreground flex items-center gap-1">
                  {messageType === 'IMAGE' && <ImageIcon className="h-3 w-3" />}
                  {messageType === 'VIDEO' && <VideoIcon className="h-3 w-3" />}
                  {messageType === 'AUDIO' && <FileAudio className="h-3 w-3" />}
                  {messageType === 'DOCUMENT' && <FileText className="h-3 w-3" />}
                  {fileName || 'arquivo'}
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">
                {(previewText || caption || 'Sua mensagem aparecera aqui...')
                  .replace(/\{\{nome\}\}/gi, 'Joao')
                  .replace(/\{\{telefone\}\}/gi, '5511999999999')}
              </p>
            </div>
          </div>
          {messageTexts.length > 1 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              +{messageTexts.length - 1} variacao(oes) — cada destinatario recebera uma aleatoriamente
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
