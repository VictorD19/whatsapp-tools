// Administrative procedure for the isolated lab only. Never reads DATABASE_URL.
import { createRequire } from 'node:module'
import { randomUUID, createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, unlinkSync, realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createConnection } from 'node:net'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(join(root, 'packages/database/package.json'))
const directory = join(root, '.instagram-test/deletion')
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
export class DeletionError extends Error {}
const fail = text => { throw new DeletionError(text) }
export function deletionCutoffKey(tenantId, accountId, participantId) {
  const scope = tenantId + '\0' + accountId
  const hash = value => createHash('sha256').update(value).digest('hex')
  return `instagram:deleted-before:${hash(scope)}:${hash(scope + '\0' + participantId)}`
}

export function validateScope(scope) {
  if (!['instagram-lab', 'instagram-other'].includes(scope.tenantId)) fail('Empresa fora do laboratório isolado.')
  if (typeof scope.accountId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(scope.accountId)) fail('Conta inválida.')
  if (scope.participantId != null && !/^\d{1,40}$/.test(scope.participantId)) fail('Participante inválido.')
}
export async function assertApiStopped() {
  await new Promise((resolve, reject) => {
    const socket = createConnection({ host: '127.0.0.1', port: 18001 })
    socket.setTimeout(1500)
    socket.once('connect', () => { socket.destroy(); reject(new DeletionError('Pare a API do laboratório na porta 18001 antes de excluir.')) })
    socket.once('error', error => { socket.destroy(); error.code === 'ECONNREFUSED' ? resolve() : reject(new DeletionError('Não foi possível confirmar que a API está parada.')) })
    socket.once('timeout', () => { socket.destroy(); reject(new DeletionError('Não foi possível confirmar que a API está parada.')) })
  })
}
export async function inspect(db, scope) {
  validateScope(scope)
  const account = await db.instagramAccount.findFirst({ where: { id: scope.accountId, tenantId: scope.tenantId }, select: { id: true, username: true, active: true, mode: true } })
  if (!account) fail('Conta não encontrada nesta empresa.')
  const where = { tenantId: scope.tenantId, accountId: scope.accountId, ...(scope.participantId ? { participantId: scope.participantId } : {}) }
  const conversations = await db.instagramConversation.findMany({ where, select: { id: true }, orderBy: { id: 'asc' } })
  const messages = await db.instagramMessage.findMany({ where: { tenantId: scope.tenantId, accountId: scope.accountId,
    ...(scope.participantId ? { conversationId: { in: conversations.map(c => c.id) } } : {}) }, select: { id: true }, orderBy: { id: 'asc' } })
  const snapshot = createHash('sha256').update(JSON.stringify({ account, conversations, messages })).digest('hex')
  return { account, conversations: conversations.length, messages: messages.length, snapshot }
}
export function validatePlan(plan, now = Date.now()) {
  if (plan?.version !== 1 || !uuid.test(plan.requestId || '')) fail('Plano de exclusão inválido.')
  validateScope(plan.scope)
  if (!Number.isFinite(plan.createdAt) || now < plan.createdAt || now - plan.createdAt > 15 * 60 * 1000) fail('Plano expirado. Prepare uma nova prévia.')
  if (!/^[a-f0-9]{64}$/.test(plan.snapshot || '')) fail('Prévia inválida.')
}
export async function clearPendingAuthorizations(redis, tenantId) {
  // Only the lab's dedicated Redis DB 2, only OAuth states belonging to this tenant.
  let cursor = '0', removed = 0
  do {
    const result = await redis.scan(cursor, 'MATCH', 'instagram:oauth:*', 'COUNT', 100)
    cursor = result[0]
    for (const key of result[1]) {
      const raw = await redis.get(key)
      let value
      try { value = JSON.parse(raw) } catch { continue }
      if (value?.tenantId === tenantId) removed += await redis.del(key)
    }
  } while (cursor !== '0')
  return removed
}
export async function executePlan(db, redis, plan) {
  validatePlan(plan)
  await assertApiStopped()
  // Cancel outstanding logins before removing an account. A failed DB operation can
  // require a new login, but never leaves a stale callback able to restore a token.
  const cancelledAuthorizations = plan.scope.participantId ? 0 : await clearPendingAuthorizations(redis, plan.scope.tenantId)
  const receipt = await db.$transaction(async tx => {
    const current = await inspect(tx, plan.scope)
    if (current.snapshot !== plan.snapshot) fail('Os dados mudaram desde a prévia. Prepare um novo plano.')
    if (plan.scope.participantId) {
      // Write the privacy fence first: if SQL later fails, older events remain
      // suppressed pending operator review instead of recreating deleted data.
      await redis.set(deletionCutoffKey(plan.scope.tenantId, plan.scope.accountId, plan.scope.participantId), String(Date.now()))
    }
    const where = { tenantId: plan.scope.tenantId, accountId: plan.scope.accountId }
    const conversations = await tx.instagramConversation.findMany({ where: { ...where, ...(plan.scope.participantId ? { participantId: plan.scope.participantId } : {}) }, select: { id: true } })
    await tx.instagramMessage.deleteMany({ where: { ...where, ...(plan.scope.participantId ? { conversationId: { in: conversations.map(c => c.id) } } : {}) } })
    await tx.instagramConversation.deleteMany({ where: { ...where, ...(plan.scope.participantId ? { participantId: plan.scope.participantId } : {}) } })
    if (!plan.scope.participantId) await tx.instagramAccount.deleteMany({ where: { id: plan.scope.accountId, tenantId: plan.scope.tenantId } })
    const remainingMessages = await tx.instagramMessage.count({ where: { ...where, ...(plan.scope.participantId ? { conversationId: { in: conversations.map(c => c.id) } } : {}) } })
    const remainingConversations = await tx.instagramConversation.count({ where: { ...where, ...(plan.scope.participantId ? { participantId: plan.scope.participantId } : {}) } })
    const remainingAccounts = plan.scope.participantId ? 0 : await tx.instagramAccount.count({ where: { id: plan.scope.accountId, tenantId: plan.scope.tenantId } })
    if (remainingMessages || remainingConversations || remainingAccounts) fail('A verificação de exclusão falhou; transação revertida.')
    return { requestId: plan.requestId, completedAt: new Date().toISOString(), scope: plan.scope.participantId ? 'participant' : 'account',
      removed: { accounts: plan.scope.participantId ? 0 : 1, conversations: current.conversations, messages: current.messages }, cancelledAuthorizations }
  }, { isolationLevel: 'Serializable', timeout: 15000 })
  if (!plan.scope.participantId) {
    const prefix = deletionCutoffKey(plan.scope.tenantId, plan.scope.accountId, '').split(':').slice(0, 3).join(':')
    let cursor = '0'
    do {
      const page = await redis.scan(cursor, 'MATCH', prefix + ':*', 'COUNT', 100)
      cursor = page[0]
      if (page[1].length) await redis.del(...page[1])
    } while (cursor !== '0')
  }
  return receipt
}
export function localClients() {
  const { PrismaClient } = require('@prisma/client')
  const Redis = createRequire(join(root, 'apps/api/package.json'))('ioredis')
  return { db: new PrismaClient({ datasources: { db: { url: 'postgresql://instagram_lab:instagram_lab_local_only@127.0.0.1:15432/instagram_lab?schema=public' } } }),
    redis: new Redis('redis://127.0.0.1:16379/2', { maxRetriesPerRequest: 1, retryStrategy: () => null }) }
}
async function main() {
  const [command, ...args] = process.argv.slice(2)
  if (command !== 'prepare' && command !== 'execute') fail('Uso: prepare --tenant <empresa> --account <id> [--participant <id>] | execute --request <id> --confirm EXCLUIR')
  const flags = {}
  for (let i = 0; i < args.length; i += 2) {
    if (!args[i]?.startsWith('--') || !args[i + 1] || flags[args[i]]) fail('Argumentos inválidos.')
    flags[args[i]] = args[i + 1]
  }
  const allowed = command === 'prepare' ? ['--tenant', '--account', '--participant'] : ['--request', '--confirm']
  if (Object.keys(flags).some(key => !allowed.includes(key))) fail('Argumento não permitido.')
  mkdirSync(directory, { recursive: true, mode: 0o700 })
  const { db, redis } = localClients()
  redis.on('error', () => {})
  try {
    // Refuse an unexpected DB even if a local port has been repurposed.
    const [identity] = await db.$queryRaw`SELECT current_database() AS name, current_user AS role`
    if (identity.name !== 'instagram_lab' || identity.role !== 'instagram_lab') fail('Banco fora do laboratório.')
    if (command === 'prepare') {
      const scope = { tenantId: flags['--tenant'], accountId: flags['--account'], ...(flags['--participant'] ? { participantId: flags['--participant'] } : {}) }
      const data = await inspect(db, scope)
      const plan = { version: 1, requestId: randomUUID(), createdAt: Date.now(), scope, snapshot: data.snapshot }
      writeFileSync(join(directory, plan.requestId + '.json'), JSON.stringify(plan), { flag: 'wx', mode: 0o600 })
      console.log(JSON.stringify({ requestId: plan.requestId, username: data.account.username, mode: data.account.mode,
        scope: scope.participantId ? 'participant' : 'account', conversations: data.conversations, messages: data.messages,
        expiresInMinutes: 15, warning: 'Exclusão permanente somente no laboratório; revise o escopo antes de confirmar.' }, null, 2))
    } else {
      const id = flags['--request']
      if (!uuid.test(id || '') || flags['--confirm'] !== 'EXCLUIR') fail('Informe o pedido e a confirmação literal EXCLUIR.')
      const path = join(directory, id + '.json')
      const plan = JSON.parse(readFileSync(path, 'utf8'))
      if (plan.requestId !== id) fail('Identificador do plano não corresponde ao pedido.')
      const receipt = await executePlan(db, redis, plan)
      writeFileSync(join(directory, id + '.receipt.json'), JSON.stringify(receipt, null, 2), { flag: 'wx', mode: 0o600 })
      unlinkSync(path)
      console.log(JSON.stringify(receipt, null, 2))
    }
  } finally { await db.$disconnect(); redis.disconnect() }
}
if (process.argv[1] && process.argv[1] !== '-' && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof DeletionError ? error.message : 'Operação não concluída. Confira o laboratório e o comprovante antes de repetir; nenhum segredo foi exibido.'); process.exitCode = 1 })
}
