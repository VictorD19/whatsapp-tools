'use client'

import React, { useState } from 'react'
import { Globe } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/components/ui/toaster'
import { useLocaleStore } from '@/stores/locale.store'
import { apiPatch } from '@/lib/api'

const LOCALES = [
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
]

const CURRENCIES = [
  { value: 'BRL', label: 'Real Brasileiro (BRL)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'ARS', label: 'Peso Argentino (ARS)' },
  { value: 'CLP', label: 'Peso Chileno (CLP)' },
  { value: 'MXN', label: 'Peso Mexicano (MXN)' },
  { value: 'COP', label: 'Peso Colombiano (COP)' },
  { value: 'PEN', label: 'Sol Peruano (PEN)' },
]

const TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
  { value: 'America/Belem', label: 'Belém (UTC-3)' },
  { value: 'America/New_York', label: 'New York (UTC-5/-4)' },
  { value: 'America/Chicago', label: 'Chicago (UTC-6/-5)' },
  { value: 'America/Denver', label: 'Denver (UTC-7/-6)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8/-7)' },
  { value: 'America/Mexico_City', label: 'Cidade do México (UTC-6/-5)' },
  { value: 'America/Bogota', label: 'Bogotá (UTC-5)' },
  { value: 'America/Lima', label: 'Lima (UTC-5)' },
  { value: 'America/Caracas', label: 'Caracas, Venezuela (UTC-4)' },
  { value: 'America/Santiago', label: 'Santiago (UTC-4/-3)' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (UTC-3)' },
  { value: 'Europe/London', label: 'Londres (UTC+0/+1)' },
  { value: 'Europe/Lisbon', label: 'Lisboa (UTC+0/+1)' },
  { value: 'Europe/Madrid', label: 'Madrid (UTC+1/+2)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4)' },
  { value: 'UTC', label: 'UTC (UTC+0)' },
]

export function LocaleSettings() {
  const { locale, timezone, currency, setLocaleSettings } = useLocaleStore()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ locale, timezone, currency })

  async function handleSave() {
    setSaving(true)
    try {
      await apiPatch('tenants/settings/locale', form)
      setLocaleSettings(form)
      toast({ title: 'Configurações salvas', description: 'Idioma e região atualizados.' })
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar as configurações.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary-500" />
          <div>
            <CardTitle className="text-base">Idioma e Região</CardTitle>
            <CardDescription>Configure idioma, fuso horário e moeda</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Idioma</Label>
            <Select value={form.locale} onValueChange={(v) => setForm((f) => ({ ...f, locale: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Fuso horário</Label>
            <Select value={form.timezone} onValueChange={(v) => setForm((f) => ({ ...f, timezone: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Moeda</Label>
            <Select value={form.currency} onValueChange={(v) => setForm((f) => ({ ...f, currency: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </Button>
      </CardContent>
    </Card>
  )
}
