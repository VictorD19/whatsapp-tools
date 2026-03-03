import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Nova campanha' }

export default function NewBroadcastPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/broadcasts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Nova campanha</h1>
          <p className="text-sm text-muted-foreground">Configure e inicie um disparo em massa</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Step 1 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">1. Informações básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nome da campanha</Label>
              <Input placeholder="Ex: Promoção de março" />
            </div>
            <div className="space-y-1.5">
              <Label>Instância WhatsApp</Label>
              <Input placeholder="Selecione uma instância..." />
            </div>
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">2. Destinatários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Importe uma lista CSV ou selecione contatos do CRM
              </p>
              <Button variant="outline" size="sm" className="mt-3">
                Importar CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">3. Mensagem</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              placeholder="Digite sua mensagem aqui... Use {{nome}} para personalizar"
              rows={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/broadcasts">
            <Button variant="outline">Cancelar</Button>
          </Link>
          <Button>Criar campanha</Button>
        </div>
      </div>
    </div>
  )
}
