require('reflect-metadata')
require('tsconfig-paths').register({ baseUrl: '/app/apps/api/dist', paths: {
  '@core/*': ['core/*'], '@shared/*': ['shared/*'], '@modules/*': ['modules/*'], '@config/*': ['config/*'],
} })
const { Module } = require('@nestjs/common')
const { CoreModule } = require('/app/apps/api/dist/core/core.module')
const { AuthModule } = require('/app/apps/api/dist/modules/auth/auth.module')
const { InstagramModule } = require('/app/apps/api/dist/modules/instagram/instagram.module')
class PilotModule {}
Module({ imports: [CoreModule, AuthModule, InstagramModule] })(PilotModule)
;(async () => {
  const app = await require('@nestjs/core').NestFactory.create(PilotModule,
    new (require('@nestjs/platform-fastify').FastifyAdapter)(), { rawBody: true })
  await app.register(require('@fastify/helmet'))
  app.setGlobalPrefix('api/v1')
  app.enableShutdownHooks()
  app.enableCors({ origin: ['https://instagram-review.sistemazapchat.com'], credentials: true })
  await app.listen(18011, '127.0.0.1')
})().catch(() => { console.error('Isolated pilot API startup failed; inspect private service configuration.'); process.exit(1) })
