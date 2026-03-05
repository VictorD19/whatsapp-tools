import React from 'react'
import { User, Bell, Shield, Plug } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { LocaleSettings } from '@/components/settings/locale-settings'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Configurações' }

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-primary-500" />
            <div>
              <CardTitle className="text-base">Perfil</CardTitle>
              <CardDescription>Informações da sua conta</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input defaultValue="João Silva" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input defaultValue="joao@empresa.com" type="email" />
            </div>
          </div>
          <Button size="sm">Salvar alterações</Button>
        </CardContent>
      </Card>

      {/* Locale */}
      <LocaleSettings />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary-500" />
            <div>
              <CardTitle className="text-base">Notificações</CardTitle>
              <CardDescription>Controle como você é notificado</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Configurações de notificação em breve.</p>
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Plug className="h-5 w-5 text-primary-500" />
            <div>
              <CardTitle className="text-base">Integrações</CardTitle>
              <CardDescription>Conecte ferramentas externas</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'n8n', status: 'Não configurado', connected: false },
              { name: 'Google Calendar', status: 'Não configurado', connected: false },
              { name: 'Zapier', status: 'Não configurado', connected: false },
            ].map((integration) => (
              <div key={integration.name} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.status}</p>
                </div>
                <Button variant="outline" size="sm">Conectar</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-destructive" />
            <div>
              <CardTitle className="text-base text-destructive">Zona de perigo</CardTitle>
              <CardDescription>Ações irreversíveis</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" size="sm">Excluir conta</Button>
        </CardContent>
      </Card>
    </div>
  )
}
