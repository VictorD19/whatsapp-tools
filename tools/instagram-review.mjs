// Separate reviewer instance. Meta configuration is optional and private; no production config.
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, symlinkSync, openSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import { metaEnvironment } from './instagram-meta-config.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dir = join(root, '.instagram-test/reviewer')
const require = createRequire(join(root, 'apps/api/package.json'))
const stateFile = join(dir, 'session.json')
const action = process.argv[2]
if (process.env.NODE_ENV === 'production') throw Error('Reviewer harness is local only')
mkdirSync(dir, { recursive: true, mode: 0o700 })
if (!existsSync(stateFile)) {
  if (action !== 'prepare') throw Error('Prepare the separate reviewer instance first')
  const secret = () => randomBytes(32).toString('hex')
  writeFileSync(stateFile, JSON.stringify({ password: secret(), db: secret(), jwt: secret(), refresh: secret(),
    encryption: randomBytes(16).toString('hex') }), { mode: 0o600 })
}
const state = JSON.parse(readFileSync(stateFile, 'utf8'))
const databaseUrl = `postgresql://instagram_review:${state.db}@127.0.0.1:25432/instagram_review?schema=public`
// Deliberately do not inherit provider credentials from the shell or the original lab.
const env = { PATH: dirname(process.execPath) + ':' + (process.env.PATH || ''), HOME: homedir(),
  NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '18011',
  DATABASE_URL: databaseUrl, REDIS_URL: 'redis://127.0.0.1:26379/0',
  JWT_SECRET: state.jwt, JWT_REFRESH_SECRET: state.refresh, ENCRYPTION_KEY: state.encryption,
  CORS_ORIGINS: 'http://localhost:18090,http://127.0.0.1:18090', WEB_URL: 'http://localhost:18090',
  INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'simulated', INSTAGRAM_PILOT_TENANT_IDS: 'instagram-review',
  INSTAGRAM_SEND_ENABLED: 'false', INSTAGRAM_APP_SECRET: '', INSTAGRAM_APP_ID: '', INSTAGRAM_CONFIG_ID: '',
  NEXT_PUBLIC_INSTAGRAM_PILOT: 'true', NEXT_PUBLIC_APP_NAME: 'ZapChat · Avaliação local',
  NEXT_PUBLIC_INSTAGRAM_REVIEW_FIXTURES: 'true',
  NEXT_PUBLIC_API_URL: 'http://localhost:18011', NEXT_PUBLIC_WS_URL: 'http://localhost:18011', NEXT_PUBLIC_APP_URL: 'http://localhost:18090',
  NEXT_TELEMETRY_DISABLED: '1', REVIEW_DB_PASSWORD: state.db,
}
const metaFile = join(dir, 'meta.json')
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : null
if (meta) {
  if (meta.sendEnabled !== false || meta.redirectUri !== 'https://instagram-review.sistemazapchat.com/api/v1/instagram/callback') throw Error('Reviewer Meta configuration must keep sending disabled and use the reviewer callback')
  Object.assign(env, metaEnvironment(meta), { CORS_ORIGINS: env.CORS_ORIGINS + ',https://instagram-review.sistemazapchat.com,http://localhost:18012,http://127.0.0.1:18012' })
}
const run = (cmd, args, cwd = dir) => {
  const result = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' })
  if (result.status !== 0) throw Error('Reviewer command failed')
}
const dbClient = () => new (require('@prisma/client').PrismaClient)({ datasources: { db: { url: databaseUrl } } })
const docker = '/Applications/Docker.app/Contents/Resources/bin/docker'
const socket = join(homedir(), '.docker/run/docker.sock')
if (action === 'prepare') {
  run(docker, ['--host', 'unix://' + socket, 'compose', '-p', 'zapchat-instagram-review', '-f', join(root, 'compose.instagram-review.yml'), 'up', '-d', '--wait'])
  run(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', join(root, 'packages/database/prisma/schema.prisma')])
  const db = dbClient()
  try {
    const plan = await db.plan.upsert({ where: { slug: 'instagram-review' }, update: {}, create: { slug: 'instagram-review', name: 'Instagram reviewer', maxInstances: 1 } })
    await db.tenant.upsert({ where: { id: 'instagram-review' }, update: {}, create: { id: 'instagram-review', slug: 'instagram-review', name: 'Avaliação local · dados fictícios', planId: plan.id } })
    if (!await db.user.findUnique({ where: { email: 'instagram-review@example.com' } })) {
      await db.user.create({ data: { tenantId: 'instagram-review', email: 'instagram-review@example.com', name: 'Avaliador local',
        password: await require('bcryptjs').hash(state.password, 10), role: 'admin' } })
    }
  } finally { await db.$disconnect() }
  const web = join(dir, 'web')
  cpSync(join(root, 'apps/web'), web, { recursive: true, filter: path => !/(^|\/)(node_modules|\.next|\.env[^/]*|tsconfig\.tsbuildinfo)(\/|$)/.test(path) })
  if (!existsSync(join(web, 'node_modules'))) symlinkSync(join(root, 'apps/web/node_modules'), join(web, 'node_modules'), 'dir')
  cpSync(join(root, 'apps/api/dist'), join(dir, 'api'), { recursive: true })
  writeFileSync(join(dir, 'bootstrap.cjs'), `require('reflect-metadata');
require('tsconfig-paths').register({baseUrl:${JSON.stringify(join(dir, 'api'))},paths:{'@core/*':['core/*'],'@shared/*':['shared/*'],'@modules/*':['modules/*'],'@config/*':['config/*']}});
const {Module}=require('@nestjs/common');
const {CoreModule}=require('./api/core/core.module');
const {AuthModule}=require('./api/modules/auth/auth.module');
const {InstagramModule}=require('./api/modules/instagram/instagram.module');
class ReviewModule{}; Module({imports:[CoreModule,AuthModule,InstagramModule]})(ReviewModule);
(async()=>{const app=await require('@nestjs/core').NestFactory.create(ReviewModule,new(require('@nestjs/platform-fastify').FastifyAdapter)(),{rawBody:true});
await app.register(require('@fastify/helmet'));app.setGlobalPrefix('api/v1');app.enableCors({origin:process.env.CORS_ORIGINS.split(','),credentials:true});await app.listen(18011,'127.0.0.1');})();
`, { mode: 0o600 })
  console.log('Separate reviewer DB, Redis, API copy and web copy prepared. No Meta account or production data copied. Credentials remain in the private session file.')
} else if (action === 'start' || action === 'start-web' || action === 'start-api') {
  // Start once; refuse a duplicate instance rather than killing an existing service.
  for (const port of action === 'start-web' ? [18090] : action === 'start-api' ? [18011] : [18011, 18090]) {
    const { createServer } = await import('node:net')
    await new Promise((resolve, reject) => { const s = createServer(); s.once('error', reject); s.listen(port, '127.0.0.1', () => s.close(resolve)) })
  }
  for (const [name, args, cwd] of [
    ['api', [join(dir, 'bootstrap.cjs')], dir],
    ['web', [join(root, 'apps/web/node_modules/next/dist/bin/next'), 'dev', '--webpack', '--hostname', '127.0.0.1', '--port', '18090'], join(dir, 'web')],
  ].filter(([name]) => (action !== 'start-web' || name === 'web') && (action !== 'start-api' || name === 'api'))) {
    const log = openSync(join(dir, name + '.log'), 'a', 0o600)
    const child = spawn(process.execPath, args, { cwd, env: { ...env, NODE_PATH: join(root, 'apps/api/node_modules') }, detached: true, stdio: ['ignore', log, log] })
    child.unref(); writeFileSync(join(dir, name + '.pid'), String(child.pid), { mode: 0o600 })
  }
  console.log('Reviewer processes started on loopback only: web18090/API18011. No external access enabled.')
} else if (action === 'status') {
  const db = dbClient()
  try {
    console.log(JSON.stringify({ database: 'instagram_review@127.0.0.1:25432', redis: '127.0.0.1:26379',
      users: await db.user.count(), tenants: await db.tenant.count(), accounts: await db.instagramAccount.count(),
      accountsWithTokens: await db.instagramAccount.count({ where: { accessToken: { not: null } } }),
      mode: meta ? 'meta' : 'simulated', realSendingEnabled: false, publicAccess: existsSync(join(dir, 'public-access.json')) }))
  } finally { await db.$disconnect() }
} else throw Error('Use prepare, start, start-web, start-api or status')
