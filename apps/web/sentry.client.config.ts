import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const isDev = process.env.NODE_ENV !== 'production'

if (!dsn && isDev) {
  console.warn('[Sentry] NEXT_PUBLIC_SENTRY_DSN não configurado — captura de erros desativada no cliente')
}

Sentry.init({
  dsn,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: isDev ? 1.0 : 0.2,
  // Em dev: loga cada evento no console antes de enviar
  debug: isDev,
  // Captura replays apenas em erros
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
})
