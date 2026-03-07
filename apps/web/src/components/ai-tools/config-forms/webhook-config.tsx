'use client'

import React from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface WebhookConfigValue {
  url?: string
  method?: string
  headers?: Record<string, string>
  bodyTemplate?: string
}

interface WebhookConfigProps {
  value: WebhookConfigValue
  onChange: (config: WebhookConfigValue) => void
}

export function WebhookConfig({ value, onChange }: WebhookConfigProps) {
  const headers = value.headers ?? {}
  const headerEntries = Object.entries(headers)

  const updateField = <K extends keyof WebhookConfigValue>(key: K, val: WebhookConfigValue[K]) => {
    onChange({ ...value, [key]: val })
  }

  const addHeader = () => {
    const newHeaders = { ...headers, '': '' }
    updateField('headers', newHeaders)
  }

  const updateHeaderKey = (oldKey: string, newKey: string, index: number) => {
    const entries = Object.entries(headers)
    entries[index] = [newKey, entries[index]![1]!]
    updateField('headers', Object.fromEntries(entries))
  }

  const updateHeaderValue = (key: string, val: string, index: number) => {
    const entries = Object.entries(headers)
    entries[index] = [entries[index]![0]!, val]
    updateField('headers', Object.fromEntries(entries))
  }

  const removeHeader = (index: number) => {
    const entries = Object.entries(headers)
    entries.splice(index, 1)
    updateField('headers', Object.fromEntries(entries))
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>URL *</Label>
        <Input
          value={value.url ?? ''}
          onChange={(e) => updateField('url', e.target.value)}
          placeholder="https://api.exemplo.com/webhook"
          type="url"
        />
      </div>

      <div className="space-y-2">
        <Label>Metodo HTTP</Label>
        <Select value={value.method ?? 'POST'} onValueChange={(v) => updateField('method', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Headers</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addHeader} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Adicionar
          </Button>
        </div>
        {headerEntries.length > 0 && (
          <div className="space-y-2">
            {headerEntries.map(([key, val], index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={key}
                  onChange={(e) => updateHeaderKey(key, e.target.value, index)}
                  placeholder="Header"
                  className="flex-1"
                />
                <Input
                  value={val}
                  onChange={(e) => updateHeaderValue(key, e.target.value, index)}
                  placeholder="Valor"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                  onClick={() => removeHeader(index)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>Body Template</Label>
        <Textarea
          value={value.bodyTemplate ?? ''}
          onChange={(e) => updateField('bodyTemplate', e.target.value)}
          placeholder='{"contato": "{{phone}}", "nome": "{{name}}"}'
          rows={3}
        />
        <p className="text-xs text-muted-foreground">
          Opcional. Use variaveis como {'{{phone}}'}, {'{{name}}'} no template.
        </p>
      </div>
    </div>
  )
}
