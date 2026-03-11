'use client'

/**
 * ROTA TEMPORÁRIA DE TESTE — remover após validar Sentry
 * Acesso: /debug-sentry
 */

import * as Sentry from '@sentry/nextjs'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function DebugSentryPage() {
  const [status, setStatus] = useState<Record<string, 'idle' | 'done' | 'error'>>({})

  function mark(key: string, state: 'done' | 'error') {
    setStatus((s) => ({ ...s, [key]: state }))
  }

  // ── Frontend Tests ────────────────────────────────────────────────────────

  function testCaptureException() {
    try {
      Sentry.captureException(
        new Error('[DEBUG] captureException manual — frontend'),
        { tags: { source: 'debug-sentry-page' } },
      )
      mark('capture', 'done')
    } catch {
      mark('capture', 'error')
    }
  }

  function testCaptureMessage() {
    try {
      Sentry.captureMessage('[DEBUG] captureMessage — frontend', 'warning')
      mark('message', 'done')
    } catch {
      mark('message', 'error')
    }
  }

  function testUncaughtThrow() {
    // Lança erro síncrono não capturado → cai no global-error.tsx
    throw new Error('[DEBUG] Erro síncrono não tratado — frontend')
  }

  // ── Backend Tests ─────────────────────────────────────────────────────────

  const API_BASE =
    (typeof window !== 'undefined' ? '' : '') +
    (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') +
    '/api/v1'

  async function testBackend500() {
    try {
      const res = await fetch(`${API_BASE}/health/debug/error-500`)
      const data = await res.json().catch(() => null)
      // eslint-disable-next-line no-console
      console.log('[DEBUG] backend 500 response:', data)
      // 500 é o esperado aqui — qualquer resposta significa que chegou ao servidor
      mark('backend500', 'done')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[DEBUG] backend 500 error:', e)
      mark('backend500', 'error')
    }
  }

  async function testBackendSentryCapture() {
    try {
      const res = await fetch(`${API_BASE}/health/debug/sentry-capture`)
      const data = await res.json()
      // eslint-disable-next-line no-console
      console.log('[DEBUG] backend sentry-capture response:', data)
      mark('backendCapture', res.ok ? 'done' : 'error')
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[DEBUG] backend sentry-capture error:', e)
      mark('backendCapture', 'error')
    }
  }

  const tests = [
    {
      key: 'capture',
      label: 'captureException (frontend)',
      description: 'Envia erro capturado manualmente ao Sentry via SDK.',
      action: testCaptureException,
      side: 'Frontend',
    },
    {
      key: 'message',
      label: 'captureMessage (frontend)',
      description: 'Envia uma mensagem de warning ao Sentry.',
      action: testCaptureMessage,
      side: 'Frontend',
    },
    {
      key: 'throw',
      label: 'Throw não tratado (frontend)',
      description: 'Lança erro síncrono → cai no global-error.tsx + Sentry.',
      action: testUncaughtThrow,
      side: 'Frontend',
    },
    {
      key: 'backend500',
      label: 'Erro 500 (backend)',
      description: 'Chama GET /health/debug/error-500 — GlobalExceptionFilter captura e envia ao Sentry.',
      action: testBackend500,
      side: 'Backend',
    },
    {
      key: 'backendCapture',
      label: 'captureException (backend)',
      description: 'Chama GET /health/debug/sentry-capture — captura manual no NestJS.',
      action: testBackendSentryCapture,
      side: 'Backend',
    },
  ]

  return (
    <div className="container max-w-2xl py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Debug — Teste Sentry</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Rota temporária. Remover após validar captura de erros.
        </p>
      </div>

      <div className="space-y-3">
        {tests.map((t) => (
          <Card key={t.key}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{t.label}</CardTitle>
                <CardDescription className="mt-0.5 text-xs">{t.description}</CardDescription>
              </div>
              <Badge variant={t.side === 'Frontend' ? 'secondary' : 'outline'} className="shrink-0">
                {t.side}
              </Badge>
            </CardHeader>
            <CardContent className="pt-0 flex items-center gap-3">
              <Button size="sm" onClick={t.action}>
                Disparar
              </Button>
              {status[t.key] === 'done' && (
                <span className="text-xs text-green-600 font-medium">Enviado ✓</span>
              )}
              {status[t.key] === 'error' && (
                <span className="text-xs text-red-500 font-medium">Falhou ✗</span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
