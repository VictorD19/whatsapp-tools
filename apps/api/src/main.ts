import { initSentry } from './instrument'
initSentry()

import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import multipart from '@fastify/multipart'
import helmet from '@fastify/helmet'
import { AppModule } from './app.module'

function validateEnv() {
  const required = ['JWT_SECRET', 'DATABASE_URL', 'REDIS_URL']
  const missing = required.filter((k) => !process.env[k])
  if (missing.length > 0) {
    throw new Error(`Variáveis de ambiente obrigatórias ausentes: ${missing.join(', ')}`)
  }

  const insecureDefaults = [
    'change-me-in-production',
    'change-me-refresh-in-production',
    'dev-jwt-secret-whatsapp-tools',
  ]
  if (process.env.NODE_ENV === 'production' && insecureDefaults.includes(process.env.JWT_SECRET!)) {
    throw new Error('JWT_SECRET está usando valor padrão inseguro em produção. Configure um secret forte.')
  }
}

async function bootstrap() {
  validateEnv()

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  // File upload support (50MB limit for WhatsApp media)
  await app.register(multipart, {
    limits: { fileSize: 50 * 1024 * 1024 },
  })

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
  })

  // CORS — origins configurados via CORS_ORIGINS (vírgula-separado)
  const rawOrigins = process.env.CORS_ORIGINS ?? ''
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)

  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    credentials: true,
  })

  app.setGlobalPrefix('api/v1')

  // Swagger apenas fora de produção
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('WhatsApp Sales Platform')
      .setDescription('API da plataforma de vendas via WhatsApp')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')

  console.log(`🚀 API rodando em http://localhost:${port}`)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 Docs em http://localhost:${port}/api/docs`)
  }
}

bootstrap()
