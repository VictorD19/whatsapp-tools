// Local lab only; synthetic data and forced transaction rollback. No Meta calls.
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const require = createRequire(join(root, 'apps/api/package.json'))
require('tsconfig-paths').register({ baseUrl: join(root, 'apps/api/dist'), paths: {
  '@core/*': ['core/*'], '@shared/*': ['shared/*'], '@modules/*': ['modules/*'], '@config/*': ['config/*'],
} })
const { PrismaClient } = require('@prisma/client')
const { ConfigService } = require('@nestjs/config')
const { InstagramConfig } = require(join(root, 'apps/api/dist/modules/instagram/instagram.config.js'))
const { InstagramService } = require(join(root, 'apps/api/dist/modules/instagram/instagram.service.js'))
const db = new PrismaClient({ datasources: { db: { url: 'postgresql://instagram_lab:instagram_lab_local_only@127.0.0.1:15432/instagram_lab?schema=public' } } })
const rollback = new Error('ROLLBACK_SYNTHETIC_STANDBY_CHECK')
const fixtureId = 'standby-check-' + randomUUID()
let sends = 0
try {
  await assert.rejects(db.$transaction(async tx => {
    const account = await tx.instagramAccount.create({ data: { id: fixtureId, tenantId: 'instagram-other',
      instagramId: '990' + Date.now(), username: '__synthetic_standby_check__', mode: 'meta', accessToken: 'fixture-only' } })
    const config = new InstagramConfig(new ConfigService({ NODE_ENV: 'test', INSTAGRAM_ENABLED: 'true', INSTAGRAM_MODE: 'meta',
      INSTAGRAM_PILOT_TENANT_IDS: 'instagram-other', INSTAGRAM_APP_ID: '123', INSTAGRAM_CONFIG_ID: '456',
      INSTAGRAM_APP_SECRET: 'synthetic-secret', INSTAGRAM_API_VERSION: 'v27.0', INSTAGRAM_REDIRECT_URI: 'https://example.test/callback', INSTAGRAM_SEND_ENABLED: 'true' }))
    const models = { instagramAccount: tx.instagramAccount, instagramConversation: tx.instagramConversation,
      instagramMessage: tx.instagramMessage, $transaction: callback => callback(tx) }
    const at = Date.now() - 10000
    const service = new InstagramService(models, { getClient: () => ({ get: async () => null, set: async () => 'OK' }) },
      { decrypt: () => 'fixture-only' }, config, {
        sendText: async () => { sends++; throw new Error('Transport must not run') },
        readRecentIncoming: async () => [{ accountId: account.instagramId, participantId: '999123', messageId: 'api-after-passive',
          text: 'Synthetic API history', at: new Date(at + 500) }],
      })
    const deliver = async (channel, timestamp, mid) => {
      const body = { object: 'instagram', entry: [{ id: account.instagramId, [channel]: [{ sender: { id: '999123' },
        recipient: { id: account.instagramId }, timestamp, message: { mid, text: 'Synthetic local check' } }] }] }
      const raw = Buffer.from(JSON.stringify(body))
      await service.webhook(raw, 'sha256=' + createHmac('sha256', 'synthetic-secret').update(raw).digest('hex'), body)
    }
    const conversation = () => tx.instagramConversation.findUniqueOrThrow({ where: { accountId_participantId: { accountId: account.id, participantId: '999123' } } })
    await deliver('standby', at, 'passive')
    const first = await conversation()
    assert.equal(first.lastWebhookChannel, 'standby')
    await service.sync('instagram-other', account.id)
    assert.equal((await conversation()).lastWebhookChannel, 'standby')
    await assert.rejects(service.reply('instagram-other', first.id, 'Never sent', randomUUID()), /somente leitura/)
    await deliver('messaging', at - 1000, 'late-normal')
    assert.equal((await conversation()).lastWebhookChannel, 'standby')
    await deliver('messaging', at + 1000, 'new-normal')
    assert.equal((await conversation()).lastWebhookChannel, 'messaging')
    await deliver('standby', at, 'late-passive')
    assert.equal((await conversation()).lastWebhookChannel, 'messaging')
    await deliver('standby', at + 1000, 'tie-passive')
    await deliver('messaging', at + 1000, 'new-normal')
    assert.equal((await conversation()).lastWebhookChannel, 'standby')
    const beforeReplay = await conversation()
    await deliver('standby', at + 1000, 'tie-passive')
    assert.equal((await conversation()).updatedAt.getTime(), beforeReplay.updatedAt.getTime())
    assert.equal(await tx.instagramMessage.count({ where: { accountId: account.id, providerMessageId: 'new-normal' } }), 1)
    assert.equal(sends, 0)
    throw rollback
  }, { timeout: 15000 }), error => error === rollback)
  assert.equal(await db.instagramAccount.count({ where: { id: fixtureId } }), 0)
  console.log('Local PostgreSQL validated: passive reply blocked, out-of-order delivery, conservative ties, deduplication and full rollback; zero Meta calls.')
} finally { await db.$disconnect() }
