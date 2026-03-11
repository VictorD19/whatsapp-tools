import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

export function initSentry() {
  const dsn = process.env.SENTRY_DSN

  if (!dsn) {
    console.warn('[Sentry] SENTRY_DSN não configurado — captura de erros desativada')
    return
  }

  const isDev = process.env.NODE_ENV !== 'production'

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: isDev ? 1.0 : 0.2,
    profilesSampleRate: 1.0,
    // Em dev: mostra no console cada evento enviado ao Sentry
    debug: isDev,
  })

  console.log(`[Sentry] Inicializado — env: ${process.env.NODE_ENV}`)
}

export { Sentry }
