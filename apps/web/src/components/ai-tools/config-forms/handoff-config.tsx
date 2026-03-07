'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface HandoffConfigProps {
  value: { message?: string }
  onChange: (config: { message: string }) => void
}

export function HandoffConfig({ value, onChange }: HandoffConfigProps) {
  return (
    <div className="space-y-2">
      <Label>Mensagem de handoff</Label>
      <Textarea
        value={value.message ?? ''}
        onChange={(e) => onChange({ message: e.target.value })}
        placeholder="Ex: Vou transferir voce para um atendente humano. Aguarde um momento..."
        rows={3}
      />
      <p className="text-xs text-muted-foreground">
        Mensagem enviada ao contato quando a conversa for transferida para um atendente.
      </p>
    </div>
  )
}
