'use client'

import React from 'react'
import { Calendar, Clock, Timer, Users, Radio } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface StepConfigProps {
  name: string
  delay: number
  scheduledAt: string
  selectedInstanceCount: number
  selectedContactListCount: number
  totalEstimatedRecipients: number
  onNameChange: (name: string) => void
  onDelayChange: (delay: number) => void
  onScheduledAtChange: (scheduledAt: string) => void
}

export function StepConfig({
  name,
  delay,
  scheduledAt,
  selectedInstanceCount,
  selectedContactListCount,
  totalEstimatedRecipients,
  onNameChange,
  onDelayChange,
  onScheduledAtChange,
}: StepConfigProps) {
  return (
    <div className="space-y-5">
      {/* Campaign name */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Nome da campanha *</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ex: Promocao de marco"
        />
      </div>

      {/* Delay */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Intervalo entre mensagens</Label>
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <Input
            type="number"
            min={1}
            max={120}
            value={delay}
            onChange={(e) => onDelayChange(Math.max(1, Math.min(120, Number(e.target.value))))}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">segundos (1-120)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Intervalo de espera entre cada mensagem enviada. Valores maiores reduzem o risco de bloqueio.
        </p>
      </div>

      {/* Schedule */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Data/hora de inicio (opcional)</Label>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => onScheduledAtChange(e.target.value)}
            className="w-auto"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {scheduledAt
            ? 'A campanha sera iniciada automaticamente na data/hora configurada (no fuso horario do tenant).'
            : 'Deixe vazio para iniciar imediatamente apos a criacao.'}
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <p className="text-sm font-medium mb-3">Resumo da campanha</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-500" />
            <span className="text-muted-foreground">Instancias:</span>
            <span className="font-medium">{selectedInstanceCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">Listas:</span>
            <span className="font-medium">{selectedContactListCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Destinatarios:</span>
            <span className="font-medium">~{totalEstimatedRecipients}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Delay:</span>
            <span className="font-medium">{delay}s</span>
          </div>
        </div>
        {totalEstimatedRecipients > 0 && (
          <p className="text-xs text-muted-foreground pt-2 border-t border-border mt-3">
            Tempo estimado: ~{Math.ceil((totalEstimatedRecipients * delay) / 60)} minutos
          </p>
        )}
      </div>
    </div>
  )
}
