// Local-only harness. It never loads the production Compose file or changes a remote resource.
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes, randomUUID } from 'node:crypto'
import { homedir } from 'node:os'
import assert from 'node:assert/strict'
import { metaTemplate, metaDiagnostics, metaEnvironment } from './instagram-meta-config.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(join(root, 'packages/database/package.json'))
const stateDir = join(root, '.instagram-test')
const stateFile = join(stateDir, 'session.json')
const metaFile = join(stateDir, 'meta.json')
mkdirSync(stateDir, { recursive: true, mode: 0o700 })
const state = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')) : {
  jwt: randomBytes(32).toString('hex'), refresh: randomBytes(32).toString('hex'),
  encryption: randomBytes(16).toString('hex'), password: randomBytes(18).toString('base64url'),
}
if (!existsSync(stateFile)) writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 })
const localSocket = existsSync(join(homedir(), '.docker/run/docker.sock')) ? join(homedir(), '.docker/run/docker.sock') : '/var/run/docker.sock'
const env = { ...process.env, PATH: dirname(process.execPath) + ':' + (process.env.PATH || ''),
  NODE_ENV: 'development', HOST: '127.0.0.1', PORT: '18001',
  DATABASE_URL: 'postgresql://instagram_lab:instagram_lab_local_only@127.0.0.1:15432/instagram_lab?schema=public',
  REDIS_URL: 'redis://127.0.0.1:16379/2', JWT_SECRET: state.jwt, JWT_REFRESH_SECRET: state.refresh, ENCRYPTION_KEY: state.encryption,
  EVOLUTION_API_URL: 'http://127.0.0.1:1', EVOLUTION_API_KEY: 'disabled-local-lab', WEBHOOK_URL: 'http://127.0.0.1:18001',
  OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '', ELEVENLABS_API_KEY: '', SENTRY_DSN: '', NEXT_PUBLIC_SENTRY_DSN: '',
  VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '', GOOGLE_REDIRECT_URL: '',
  MINIO_ENDPOINT: 'http://127.0.0.1:19000', MINIO_ACCESS_KEY: 'instagram_lab', MINIO_SECRET_KEY: 'instagram_lab_local_only',
  MINIO_BUCKET: 'instagram-lab', MINIO_PUBLIC_URL: 'http://127.0.0.1:19000', MINIO_FORCE_PATH_STYLE: 'true',
  CORS_ORIGINS: 'http://localhost:18080,http://127.0.0.1:18080', WEB_URL: 'http://localhost:18080',
  NEXT_PUBLIC_API_URL: 'http://localhost:18001', NEXT_PUBLIC_WS_URL: 'http://localhost:18001', NEXT_PUBLIC_APP_URL: 'http://localhost:18080',
  NEXT_PUBLIC_APP_NAME: 'ZapChat · Instagram testes', NEXT_PUBLIC_INSTAGRAM_PILOT: 'true',
  INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'simulated', INSTAGRAM_PILOT_TENANT_IDS: 'instagram-lab',
  INSTAGRAM_SEND_ENABLED: 'false', INSTAGRAM_APP_ID: '', INSTAGRAM_CONFIG_ID: '', INSTAGRAM_APP_SECRET: '', INSTAGRAM_VERIFY_TOKEN: '',
  INSTAGRAM_REDIRECT_URI: '', INSTAGRAM_API_VERSION: '',
}
const run = (command, args, cwd = root) => {
  const result = spawnSync(command, args, { cwd, env, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`Comando de testes terminou com erro (${result.status})`)
}
const prisma = args => run(process.execPath, [require.resolve('prisma/build/index.js'), ...args, '--schema', join(root, 'packages/database/prisma/schema.prisma')])
const action = process.argv[2]
if (action === 'meta-init') {
  if (!existsSync(metaFile)) writeFileSync(metaFile, JSON.stringify({ ...metaTemplate(), verifyToken: randomBytes(32).toString('base64url') }, null, 2), { mode: 0o600 })
  console.log('Configuração privada preparada em .instagram-test/meta.json. Nenhuma conta foi conectada e nenhum envio foi habilitado.')
} else if (action === 'meta-check' || action === 'api-meta') {
  let meta
  try { meta = JSON.parse(readFileSync(metaFile, 'utf8')) }
  catch { console.error('Execute meta-init e preencha .instagram-test/meta.json localmente. Não envie os segredos pelo chat.'); process.exit(1) }
  const problems = metaDiagnostics(meta)
  if (problems.length) { console.error('Falta configurar:\n- ' + problems.join('\n- ')); process.exitCode = 1 }
  else if (action === 'meta-check') console.log('Campos locais completos. OAuth, permissões, HTTPS e webhook ainda precisam de validação real. Envio real: ' + (meta.sendEnabled ? 'habilitado para testes' : 'desabilitado'))
  else {
    Object.assign(env, metaEnvironment(meta))
    console.log('Iniciando Meta no banco local exclusivo do laboratório. Envio real: ' + (meta.sendEnabled ? 'habilitado para testes' : 'desabilitado'))
    run(process.execPath, [join(root, 'apps/api/node_modules/@nestjs/cli/bin/nest.js'), 'start', '--watch'], join(root, 'apps/api'))
  }
} else if (action === 'init') {
  const docker = existsSync('/Applications/Docker.app/Contents/Resources/bin/docker') ? '/Applications/Docker.app/Contents/Resources/bin/docker' : 'docker'
  run(docker, ['--host', 'unix://' + localSocket, 'compose', '-p', 'zapchat-instagram-test', '-f', 'compose.instagram-test.yml', 'up', '-d', '--wait'])
  prisma(['generate']); prisma(['migrate', 'deploy'])
  const { PrismaClient } = require('@prisma/client')
  const bcrypt = require('bcryptjs')
  const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } })
  try {
    const plan = await db.plan.upsert({ where: { slug: 'instagram-lab' }, update: {}, create: { name: 'Instagram Lab', slug: 'instagram-lab', maxInstances: 1 } })
    for (const id of ['instagram-lab', 'instagram-other']) {
      await db.tenant.upsert({ where: { id }, update: {}, create: { id, name: id, slug: id, planId: plan.id } })
      await db.user.upsert({ where: { email: id + '@example.com' }, update: { password: await bcrypt.hash(state.password, 10) },
        create: { tenantId: id, name: id, email: id + '@example.com', password: await bcrypt.hash(state.password, 10), role: 'admin' } })
    }
  } finally { await db.$disconnect() }
  console.log('Ambiente isolado pronto. Login: instagram-lab@example.com. Senha local no arquivo .instagram-test/session.json (não versionado).')
} else if (action === 'api') {
  run(process.execPath, [join(root, 'apps/api/node_modules/@nestjs/cli/bin/nest.js'), 'start', '--watch'], join(root, 'apps/api'))
} else if (action === 'web') {
  run(process.execPath, [join(root, 'apps/web/node_modules/next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '18080'], join(root, 'apps/web'))
} else if (action === 'smoke') {
  const base = 'http://127.0.0.1:18001/api/v1/'
  const request = async (path, method = 'GET', body, token) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined })
    return { status: response.status, body: await response.json() }
  }
  const login = await request('auth/login', 'POST', { email: 'instagram-lab@example.com', password: state.password })
  assert.equal(login.status, 200)
  const token = login.body.data.accessToken
  assert.ok(token)
  const account = (await request('instagram/simulated-account', 'POST', {}, token)).body.data
  assert.equal(account.mode, 'simulated')
  assert.equal('accessToken' in account, false)
  const mid = 'smoke-' + randomBytes(12).toString('hex')
  const inbound = { accountId: account.id, participantId: String(Date.now()), text: 'Olá, teste local', messageId: mid }
  await request('instagram/simulate-inbound', 'POST', inbound, token)
  await request('instagram/simulate-inbound', 'POST', inbound, token)
  const conversations = (await request(`instagram/accounts/${account.id}/conversations`, 'GET', undefined, token)).body.data
  const conversation = conversations.find(c => c.participantId === inbound.participantId)
  assert.ok(conversation)
  const reply = { text: 'Resposta local', requestId: randomUUID() }
  const first = (await request(`instagram/conversations/${conversation.id}/reply`, 'POST', reply, token)).body.data
  const duplicate = (await request(`instagram/conversations/${conversation.id}/reply`, 'POST', reply, token)).body.data
  assert.equal(first.status, 'sent'); assert.equal(first.id, duplicate.id)
  const messages = (await request(`instagram/conversations/${conversation.id}/messages`, 'GET', undefined, token)).body.data
  assert.equal(messages.length, 2)
  const other = (await request('auth/login', 'POST', { email: 'instagram-other@example.com', password: state.password })).body.data.accessToken
  assert.equal((await request(`instagram/conversations/${conversation.id}/messages`, 'GET', undefined, other)).status, 404)
  assert.equal((await request(`instagram/conversations/${conversation.id}/messages`)).status, 401)
  console.log('Percurso HTTP validado: login, conta simulada, mensagem persistida, resposta, deduplicação e isolamento entre empresas. Nenhuma chamada à Meta.')
} else {
  console.error('Uso: node tools/instagram-lab.mjs init | api | web | smoke | meta-init | meta-check | api-meta')
  process.exitCode = 1
}
