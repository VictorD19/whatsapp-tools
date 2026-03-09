import React from 'react'
import { ArrowLeft, QrCode, Wifi } from 'lucide-react'
import Link from 'next/link'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/shared/status-badge'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Instância' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function InstanceDetailPage({ params }: Props) {
  const { id } = await params

  return (
    <PageLayout
      breadcrumb={[{ label: 'Configurações' }, { label: 'Instâncias' }]}
      cardClassName="p-5 space-y-5 max-w-2xl"
    >
        <div className="flex items-center gap-3">
          <Link href="/instances">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Instância #{id}</h1>
            <p className="text-sm text-muted-foreground">Detalhes e configurações</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status da conexão</CardTitle>
              <StatusBadge status="disconnected" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/50">
                <div className="text-center">
                  <QrCode className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-xs text-muted-foreground mt-2">Clique em conectar para gerar QR</p>
                </div>
              </div>
              <Button>
                <Wifi className="h-4 w-4" />
                Gerar QR Code
              </Button>
              <p className="text-xs text-muted-foreground text-center max-w-xs">
                Abra o WhatsApp no seu celular → Menu → Dispositivos conectados → Conectar dispositivo
              </p>
            </div>
          </CardContent>
        </Card>
    </PageLayout>
  )
}
