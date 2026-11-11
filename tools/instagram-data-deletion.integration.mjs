// Run with the local lab API stopped. Creates and removes only its own fixtures.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { readFileSync, statSync, existsSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { assertApiStopped, deletionCutoffKey, inspect, executePlan, localClients } from './instagram-data-deletion.mjs'

await assertApiStopped()
const { db, redis } = localClients()
redis.on('error', () => {})
const suffix = String(Date.now()), ids = [], keys = []
const beforeOtherTables = await Promise.all([db.contact.count(), db.conversation.count(), db.message.count(), db.user.count()])
const realBefore = await db.instagramAccount.findMany({ where: { mode: 'meta' }, orderBy: { id: 'asc' } })
const planFor = async scope => ({ version: 1, requestId: randomUUID(), createdAt: Date.now(), scope, snapshot: (await inspect(db, scope)).snapshot })
try {
  const a = await db.instagramAccount.create({ data: { tenantId: 'instagram-other', instagramId: '991' + suffix, username: 'deletion_fixture', mode: 'simulated' } }); ids.push(a.id)
  const other = await db.instagramAccount.create({ data: { tenantId: 'instagram-lab', instagramId: '992' + suffix, username: 'deletion_other_fixture', mode: 'simulated' } }); ids.push(other.id)
  const makeConversation = async (account, participantId) => {
    const c = await db.instagramConversation.create({ data: { tenantId: account.tenantId, accountId: account.id, participantId } })
    await db.instagramMessage.create({ data: { tenantId: account.tenantId, accountId: account.id, conversationId: c.id, direction: 'in', text: 'Fictício: teste de exclusão', providerMessageId: randomUUID() } })
    return c
  }
  await makeConversation(a, '111'); await makeConversation(a, '222'); const oc = await makeConversation(other, '111')
  await assert.rejects(inspect(db, { tenantId: 'instagram-lab', accountId: a.id }))
  const stale = await planFor({ tenantId: a.tenantId, accountId: a.id })
  await db.instagramMessage.create({ data: { tenantId: a.tenantId, accountId: a.id, conversationId: (await db.instagramConversation.findFirst({ where: { accountId: a.id } })).id, direction: 'out', text: 'Outra mensagem fictícia', status: 'unknown' } })
  await assert.rejects(executePlan(db, redis, stale), /mudaram/)
  assert.equal(await db.instagramMessage.count({ where: { accountId: a.id } }), 3)
  const scoped = await planFor({ tenantId: a.tenantId, accountId: a.id, participantId: '111' })
  const removedParticipant = await executePlan(db, redis, scoped)
  const cutoffKey = deletionCutoffKey(a.tenantId, a.id, '111'); keys.push(cutoffKey)
  assert.ok(Number(await redis.get(cutoffKey)) > 0)
  assert.equal(removedParticipant.removed.conversations, 1)
  assert.equal(await db.instagramConversation.count({ where: { accountId: a.id, participantId: '111' } }), 0)
  assert.equal(await db.instagramConversation.count({ where: { accountId: a.id, participantId: '222' } }), 1)
  assert.ok(await db.instagramAccount.findUnique({ where: { id: a.id } }))
  const pending = 'instagram:oauth:deletion-' + randomUUID(), pendingOther = pending + '-other'; keys.push(pending, pendingOther)
  await redis.set(pending, JSON.stringify({ tenantId: a.tenantId }), 'EX', 600)
  await redis.set(pendingOther, JSON.stringify({ tenantId: other.tenantId }), 'EX', 600)
  const complete = await executePlan(db, redis, await planFor({ tenantId: a.tenantId, accountId: a.id }))
  assert.equal(complete.removed.accounts, 1)
  assert.equal(await db.instagramAccount.count({ where: { id: a.id } }), 0)
  assert.equal(await db.instagramMessage.count({ where: { accountId: a.id } }), 0)
  assert.equal(await db.instagramConversation.count({ where: { accountId: a.id } }), 0)
  assert.equal(await redis.get(cutoffKey), null)
  assert.equal(await redis.get(pending), null); assert.ok(await redis.get(pendingOther))
  assert.ok(await db.instagramConversation.findUnique({ where: { id: oc.id } }))
  assert.deepEqual(await Promise.all([db.contact.count(), db.conversation.count(), db.message.count(), db.user.count()]), beforeOtherTables)
  assert.deepEqual(await db.instagramAccount.findMany({ where: { mode: 'meta' }, orderBy: { id: 'asc' } }), realBefore)
  // Receipt contains no account identifier, message body or token.
  assert.deepEqual(Object.keys(complete).sort(), ['cancelledAuthorizations', 'completedAt', 'removed', 'requestId', 'scope'])
  // Exercise the actual CLI, private plan and receipt files, not only its helpers.
  await db.instagramAccount.create({ data: { id: a.id, tenantId: a.tenantId, instagramId: '993' + suffix, username: 'deletion_cli_fixture', mode: 'simulated' } })
  const cli = fileURLToPath(new URL('./instagram-data-deletion.mjs', import.meta.url))
  const prepared = spawnSync(process.execPath, [cli, 'prepare', '--tenant', a.tenantId, '--account', a.id], { encoding: 'utf8' })
  assert.equal(prepared.status, 0, prepared.stderr)
  const requestId = JSON.parse(prepared.stdout).requestId
  const planPath = fileURLToPath(new URL('../.instagram-test/deletion/' + requestId + '.json', import.meta.url))
  const receiptPath = planPath.replace('.json', '.receipt.json')
  assert.equal(statSync(planPath).mode & 0o777, 0o600)
  const rejected = spawnSync(process.execPath, [cli, 'execute', '--request', requestId, '--confirm', 'invalid'], { encoding: 'utf8' })
  assert.notEqual(rejected.status, 0); assert.ok(await db.instagramAccount.findUnique({ where: { id: a.id } }))
  const executed = spawnSync(process.execPath, [cli, 'execute', '--request', requestId, '--confirm', 'EXCLUIR'], { encoding: 'utf8' })
  assert.equal(executed.status, 0, executed.stderr)
  assert.equal(existsSync(planPath), false)
  assert.equal(statSync(receiptPath).mode & 0o777, 0o600)
  assert.equal(JSON.parse(readFileSync(receiptPath, 'utf8')).removed.accounts, 1)
  assert.equal(await db.instagramAccount.count({ where: { id: a.id } }), 0)
  unlinkSync(receiptPath)
  console.log('PASS: escopo por empresa/participante, prévia alterada recusada, exclusão integral e CLI com comprovante privado verificados, OAuth antigo cancelado; outra empresa, WhatsApp e conta Meta preservados.')
} finally {
  for (const id of ids) {
    await db.instagramMessage.deleteMany({ where: { accountId: id } })
    await db.instagramConversation.deleteMany({ where: { accountId: id } })
    await db.instagramAccount.deleteMany({ where: { id } })
  }
  if (keys.length) await redis.del(...keys)
  await db.$disconnect(); redis.disconnect()
}
