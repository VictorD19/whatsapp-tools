import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
  )

  app.enableCors()
  app.setGlobalPrefix('api/v1')

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('WhatsApp Sales Platform')
    .setDescription('API da plataforma de vendas via WhatsApp')
    .setVersion('1.0')
    .addBearerAuth()
    .build()

  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup('api/docs', app, document)

  const port = process.env.PORT ?? 3001
  await app.listen(port, '0.0.0.0')

  console.log(`🚀 API rodando em http://localhost:${port}`)
  console.log(`📚 Docs em http://localhost:${port}/api/docs`)
}

bootstrap()
