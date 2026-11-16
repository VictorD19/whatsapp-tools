const { readFileSync } = require('node:fs')
const { createRequire } = require('node:module')
const { spawn, spawnSync } = require('node:child_process')

async function main() {
  const shared = process.env.INSTAGRAM_PILOT_SHARED_HOST === 'true'
  const config = JSON.parse(readFileSync('/run/secrets/pilot_runtime', 'utf8'))
  const separateReviewer = typeof config.reviewerLoginPassword === 'string' && config.reviewerLoginPassword.length >= 24
  const dbUrl = new URL(config.databaseUrl)
  if (config.version !== 1 || dbUrl.protocol !== 'postgresql:' || dbUrl.hostname !== 'postgres' || dbUrl.port !== '5432' || dbUrl.pathname !== '/instagram_review' || dbUrl.username !== 'instagram_review' ||
      config.meta.redirectUri !== 'https://instagram-review.sistemazapchat.com/api/v1/instagram/callback' || config.meta.sendEnabled !== false ||
      !/^\d+$/.test(config.meta.appId) || !/^\d+$/.test(config.meta.configId) || !/^v\d+\.\d+$/.test(config.meta.apiVersion) ||
      typeof config.meta.appSecret !== 'string' || !config.meta.appSecret ||
      [[config.meta.verifyToken, 32], [config.jwt, 48], [config.refresh, 48], [config.loginPassword, 24]].some(([value, length]) => typeof value !== 'string' || value.length < length) ||
      typeof config.encryption !== 'string' || config.encryption.length !== 32) throw Error('Unexpected deployment configuration')
  const base = { PATH: process.env.PATH, HOME: '/tmp', NODE_PATH: '/app/apps/api/node_modules',
    // A compiled pilot instance, never AppModule or the production enable flag.
    NODE_ENV: 'test', DATABASE_URL: config.databaseUrl, REDIS_URL: 'redis://redis:6379/0',
    JWT_SECRET: config.jwt, JWT_REFRESH_SECRET: config.refresh, ENCRYPTION_KEY: config.encryption,
    INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'meta', INSTAGRAM_PILOT_TENANT_IDS: separateReviewer ? 'instagram-review,instagram-meta-review' : 'instagram-review', INSTAGRAM_SEND_ENABLED: 'false',
    INSTAGRAM_APP_ID: config.meta.appId, INSTAGRAM_APP_SECRET: config.meta.appSecret, INSTAGRAM_CONFIG_ID: config.meta.configId,
    INSTAGRAM_VERIFY_TOKEN: config.meta.verifyToken, INSTAGRAM_API_VERSION: config.meta.apiVersion, INSTAGRAM_REDIRECT_URI: config.meta.redirectUri,
    INSTAGRAM_REVIEW_CONTAINER: 'true', CORS_ORIGINS: 'https://instagram-review.sistemazapchat.com', NEXT_TELEMETRY_DISABLED: '1',
    ...(shared ? { NODE_OPTIONS: '--max-old-space-size=160' } : {}) }
  if (process.getuid() === 0) { process.setgid(1000); process.setuid(1000) }
  const requireApi = createRequire('/app/apps/api/package.json')
  const migration = spawnSync(process.execPath, [requireApi.resolve('prisma/build/index.js'), 'migrate', 'deploy', '--schema', '/app/packages/database/prisma/schema.prisma'], { env: base, stdio: 'inherit' })
  if (migration.status !== 0) throw Error('Pilot migration failed')
  const db = new (requireApi('@prisma/client').PrismaClient)({ datasources: { db: { url: config.databaseUrl } } })
  try {
    const plan = await db.plan.upsert({ where: { slug: 'instagram-review' }, update: {}, create: { slug: 'instagram-review', name: 'Instagram pilot', maxInstances: 1 } })
    await db.tenant.upsert({ where: { id: 'instagram-review' }, update: {}, create: { id: 'instagram-review', slug: 'instagram-review', name: 'Instagram · piloto separado', planId: plan.id } })
    if (!await db.user.findUnique({ where: { email: 'instagram-review@example.com' } })) await db.user.create({ data: {
      tenantId: 'instagram-review', email: 'instagram-review@example.com', name: 'Avaliador Instagram', role: 'admin',
      password: await requireApi('bcryptjs').hash(config.loginPassword, 12) } })
    if (separateReviewer) {
      await db.tenant.upsert({ where: { id: 'instagram-meta-review' }, update: {}, create: {
        id: 'instagram-meta-review', slug: 'instagram-meta-review', name: 'Avaliação Meta · ambiente separado', planId: plan.id } })
      const reviewer = await db.user.findUnique({ where: { email: 'meta-review@example.com' } })
      if (reviewer && (reviewer.tenantId !== 'instagram-meta-review' || reviewer.isSuperAdmin)) throw Error('Unexpected reviewer ownership')
      if (!reviewer) await db.user.create({ data: {
        tenantId: 'instagram-meta-review', email: 'meta-review@example.com', name: 'Avaliador Meta', role: 'admin',
        password: await requireApi('bcryptjs').hash(config.reviewerLoginPassword, 12) } })
    }
  } finally { await db.$disconnect() }
  const children = [], stop = () => { for (const child of children) child.kill('SIGTERM') }
  process.on('SIGTERM', () => { stop(); setTimeout(() => process.exit(0), 2000).unref() })
  process.on('SIGINT', () => { stop(); process.exit(0) })
  for (const [path, env] of [
    ['/app/infra/instagram-host/bootstrap.cjs', base],
    ['/app/web/apps/web/server.js', { PATH: base.PATH, HOME: '/tmp', NODE_ENV: 'production', PORT: '18091', HOSTNAME: '127.0.0.1', NEXT_TELEMETRY_DISABLED: '1', ...(shared ? { NODE_OPTIONS: '--max-old-space-size=128' } : {}) }],
    ['/app/tools/instagram-review-gateway.mjs', { PATH: base.PATH, INSTAGRAM_REVIEW_CONTAINER: 'true', ...(shared ? { NODE_OPTIONS: '--max-old-space-size=64' } : {}) }],
  ]) {
    const child = spawn(process.execPath, [path], { env, stdio: 'inherit' }); children.push(child)
    child.once('exit', () => { stop(); process.exit(1) })
  }
}
main().catch(() => { console.error('Isolated pilot startup refused or failed. No production service was contacted.'); process.exit(1) })
