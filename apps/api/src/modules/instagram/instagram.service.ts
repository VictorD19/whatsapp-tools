import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { RedisService } from '@core/redis/redis.service'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'
import { randomBytes, randomInt, randomUUID } from 'crypto'
import { InstagramConfig } from './instagram.config'
import { InstagramAdapter } from './instagram.adapter'
import { canReply, deletionCutoffKey, IncomingDirect, incomingDirects, signatureMatches } from './instagram.policy'

const accountFields = { id: true, instagramId: true, username: true, mode: true, active: true, tokenExpiresAt: true } as const

@Injectable()
export class InstagramService {
  constructor(private readonly db: PrismaService, private readonly redis: RedisService,
    private readonly crypto: AesCryptoService, private readonly config: InstagramConfig,
    private readonly adapter: InstagramAdapter) {}

  status(tenantId: string) {
    return { enabled: this.config.allowed(tenantId), mode: this.config.mode, testOnly: true,
      realSendingEnabled: this.config.allowed(tenantId) && this.config.mode === 'meta' && this.config.get('INSTAGRAM_SEND_ENABLED') === 'true' }
  }
  accounts(tenantId: string) {
    this.config.assertTenant(tenantId)
    return this.db.instagramAccount.findMany({ where: { tenantId, mode: this.config.mode }, select: accountFields, orderBy: { createdAt: 'desc' } })
  }
  async simulatedAccount(tenantId: string) {
    this.config.assertSimulated(tenantId)
    const existing = await this.db.instagramAccount.findFirst({ where: { tenantId, mode: 'simulated', active: true }, select: accountFields })
    if (existing) return existing
    return this.db.instagramAccount.create({ data: { tenantId, instagramId: '990' + randomInt(100000000, 999999999), username: 'instagram_teste', mode: 'simulated' }, select: accountFields })
  }
  async connect(tenantId: string, userId: string) {
    this.config.assertTenant(tenantId)
    const state = randomBytes(32).toString('base64url')
    const url = this.adapter.authUrl(state)
    await this.redis.getClient().set(`instagram:oauth:${state}`, JSON.stringify({ tenantId, userId }), 'EX', 600, 'NX')
    return { url }
  }
  async callback(code: string, state: string) {
    this.config.assertEnabled()
    if (!/^[A-Za-z0-9_-]{43}$/.test(state || '') || !code || code.length > 2048) throw new BadRequestException('Autorização inválida')
    // Single use, including when provider exchange fails. No tenant identifiers or verifier in the URL.
    const raw = await this.redis.getClient().getdel(`instagram:oauth:${state}`)
    if (!raw) throw new BadRequestException('Autorização expirada ou já utilizada')
    const { tenantId } = JSON.parse(raw) as { tenantId: string }
    this.config.assertTenant(tenantId)
    const account = await this.adapter.exchange(code)
    const existing = await this.db.instagramAccount.findUnique({ where: { instagramId: account.instagramId } })
    if (existing && existing.tenantId !== tenantId) throw new ConflictException('Conta Instagram indisponível para esta empresa')
    const data = { username: account.username, clientBusinessId: account.clientBusinessId, mode: 'meta', active: true,
      accessToken: this.crypto.encrypt(account.token), tokenExpiresAt: account.expiresAt }
    if (existing) {
      await this.db.instagramAccount.updateMany({ where: { id: existing.id, tenantId }, data })
      return this.db.instagramAccount.findFirst({ where: { id: existing.id, tenantId }, select: accountFields })
    }
    // A concurrent authorization may have claimed this account for a different tenant.
    // Never use an unscoped upsert/update after the ownership check.
    try { return await this.db.instagramAccount.create({ data: { ...data, tenantId, instagramId: account.instagramId }, select: accountFields }) }
    catch { throw new ConflictException('Não foi possível vincular a conta. Atualize as conexões e tente novamente.') }
  }
  async disconnect(tenantId: string, accountId: string) {
    this.config.assertTenant(tenantId)
    await this.account(tenantId, accountId)
    await this.db.instagramAccount.updateMany({ where: { id: accountId, tenantId }, data: { active: false, accessToken: null } })
    return { disconnected: true }
  }
  async sync(tenantId: string, accountId: string) {
    this.config.assertTenant(tenantId)
    this.config.assertMeta()
    const account = await this.account(tenantId, accountId)
    if (account.mode !== 'meta' || !account.accessToken ||
      (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now())) throw new BadRequestException('Reconecte o Instagram antes de sincronizar')
    // Bounded pilot polling: at most four provider reads every 90 seconds.
    // A shared Redis cooldown prevents concurrent tabs or repeated clicks from
    // multiplying provider traffic. Failed reads also respect this cooldown.
    const acquired = await this.redis.getClient().set(`instagram:sync:${account.id}`, randomUUID(), 'EX', 90, 'NX')
    if (acquired !== 'OK') return { synchronized: false, processed: 0, retryAfterSeconds: 90 }
    const since = Math.max(account.createdAt.getTime(), Date.now() - 86400000)
    const events = await this.adapter.readRecentIncoming(account.instagramId, this.crypto.decrypt(account.accessToken), since)
    const stillConnected = await this.db.instagramAccount.findFirst({ where: { id: account.id, tenantId, active: true,
      mode: 'meta', accessToken: account.accessToken }, select: { id: true } })
    if (!stillConnected) return { synchronized: false, processed: 0, retryAfterSeconds: 90 }
    let processed = 0
    for (const event of events) {
      if (event.accountId !== account.instagramId) continue
      await this.persistIncoming(account, event)
      processed++
    }
    return { synchronized: true, processed, retryAfterSeconds: 90 }
  }
  verify(query: Record<string, string>) {
    this.config.assertEnabled()
    const expected = this.config.get('INSTAGRAM_VERIFY_TOKEN')
    if (!expected || query['hub.mode'] !== 'subscribe' || query['hub.verify_token'] !== expected || !query['hub.challenge']) throw new ForbiddenException('Verificação inválida')
    return query['hub.challenge']
  }
  async webhook(raw: Buffer, signature: string | undefined, payload: unknown) {
    this.config.assertEnabled()
    if (this.config.mode !== 'meta' || !signatureMatches(raw, signature, this.config.get('INSTAGRAM_APP_SECRET'))) throw new ForbiddenException('Assinatura inválida')
    for (const event of incomingDirects(payload, Date.now())) {
      const account = await this.db.instagramAccount.findUnique({ where: { instagramId: event.accountId } })
      if (!account?.active || account.mode !== 'meta' || !this.config.allowed(account.tenantId)) continue
      await this.persistIncoming(account, event)
    }
    return { received: true }
  }
  private async persistIncoming(account: { id: string; tenantId: string }, event: IncomingDirect) {
    // Do not recreate erased conversations when Meta retries an old notification.
    // Redis failure must fail the request so the provider can retry safely later.
    const cutoff = await this.redis.getClient().get(deletionCutoffKey(account.tenantId, account.id, event.participantId))
    if (cutoff != null) {
      const timestamp = Number(cutoff)
      if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error('invalid_deletion_cutoff')
      if (event.at.getTime() <= timestamp) return null
    }
    // Commit before acknowledging the webhook. Provider retries remain safe after a crash.
    return this.db.$transaction(async tx => {
      const conversation = await tx.instagramConversation.upsert({ where: { accountId_participantId: { accountId: account.id, participantId: event.participantId } },
        create: { accountId: account.id, tenantId: account.tenantId, participantId: event.participantId }, update: {} })
      const created = await tx.instagramMessage.createMany({ data: [{ tenantId: account.tenantId, accountId: account.id,
        conversationId: conversation.id, direction: 'in', text: event.text, providerMessageId: event.messageId, sentAt: event.at }], skipDuplicates: true })
      if (created.count) await tx.instagramConversation.updateMany({ where: { id: conversation.id, tenantId: account.tenantId,
        OR: [{ lastInboundAt: null }, { lastInboundAt: { lt: event.at } }] }, data: { lastInboundAt: event.at } })
      return conversation
    })
  }
  async simulate(tenantId: string, accountId: string, participantId: string, text: string, messageId?: string) {
    this.config.assertSimulated(tenantId)
    const account = await this.account(tenantId, accountId)
    if (account.mode !== 'simulated') throw new BadRequestException('Escolha uma conta simulada')
    return this.persistIncoming(account, { accountId: account.instagramId, participantId, text,
      messageId: messageId || 'simulated-' + randomUUID(), at: new Date() })
  }
  conversations(tenantId: string, accountId: string) {
    this.config.assertTenant(tenantId)
    return this.db.instagramConversation.findMany({ where: { tenantId, accountId }, take: 50, orderBy: { updatedAt: 'desc' },
      select: { id: true, participantId: true, lastInboundAt: true, updatedAt: true } })
  }
  async messages(tenantId: string, conversationId: string, before?: string) {
    this.config.assertTenant(tenantId)
    await this.conversation(tenantId, conversationId)
    const cursor = before ? await this.db.instagramMessage.findFirst({ where: { id: before, tenantId, conversationId }, select: { id: true } }) : null
    if (before && !cursor) throw new BadRequestException('Cursor inválido')
    return this.db.instagramMessage.findMany({ where: { tenantId, conversationId }, take: 50,
      ...(cursor ? { cursor, skip: 1 } : {}), orderBy: [{ sentAt: 'desc' }, { id: 'desc' }],
      select: { id: true, direction: true, text: true, status: true, sentAt: true, requestId: true } })
  }
  private async account(tenantId: string, id: string) {
    const account = await this.db.instagramAccount.findFirst({ where: { id, tenantId, active: true } })
    if (!account) throw new NotFoundException('Conta Instagram indisponível')
    return account
  }
  private async conversation(tenantId: string, id: string) {
    const conversation = await this.db.instagramConversation.findFirst({ where: { id, tenantId } })
    if (!conversation) throw new NotFoundException('Conversa Instagram indisponível')
    return conversation
  }
  async reply(tenantId: string, conversationId: string, text: string, requestId: string) {
    this.config.assertTenant(tenantId)
    const conversation = await this.conversation(tenantId, conversationId)
    const account = await this.account(tenantId, conversation.accountId)
    if (account.mode !== this.config.mode) throw new BadRequestException('O modo da conexão mudou; escolha outra conta')
    const existing = await this.db.instagramMessage.findUnique({ where: { accountId_requestId: { accountId: account.id, requestId } } })
    if (existing) {
      if (existing.conversationId !== conversationId || existing.text !== text) throw new ConflictException('Identificador já utilizado para outra mensagem')
      return { id: existing.id, status: existing.status }
    }
    if (!canReply(conversation.lastInboundAt, Date.now())) throw new BadRequestException('A janela de resposta de 24 horas terminou')
    if (account.mode === 'meta' && (!account.accessToken || (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now()))) throw new BadRequestException('Reconecte o Instagram: autorização ausente ou expirada')
    if (account.mode === 'meta' && this.config.get('INSTAGRAM_SEND_ENABLED') !== 'true') throw new ForbiddenException('Envio real desabilitado no piloto')
    // Unique request ID plus atomic claim prevents concurrent HTTP retries sending twice.
    const message = await this.db.instagramMessage.upsert({ where: { accountId_requestId: { accountId: account.id, requestId } },
      create: { tenantId, accountId: account.id, conversationId, direction: 'out', text, requestId, status: 'pending' }, update: {} })
    if (message.conversationId !== conversationId || message.text !== text) throw new ConflictException('Identificador já utilizado')
    const claim = await this.db.instagramMessage.updateMany({ where: { id: message.id, tenantId, status: 'pending' }, data: { status: 'sending' } })
    if (!claim.count) return { id: message.id, status: message.status }
    try {
      this.config.assertTenant(tenantId)
      const current = await this.account(tenantId, account.id)
      if (current.mode !== this.config.mode || (current.mode === 'meta' && (!current.accessToken ||
          (current.tokenExpiresAt && current.tokenExpiresAt.getTime() <= Date.now())))) throw new Error('connection_changed')
      if (!canReply(conversation.lastInboundAt, Date.now())) throw new Error('reply_window_closed')
      const token = current.accessToken ? this.crypto.decrypt(current.accessToken) : null
      const providerMessageId = await this.adapter.sendText(account.instagramId, conversation.participantId, token, text)
      await this.db.instagramMessage.updateMany({ where: { id: message.id, tenantId }, data: { providerMessageId, status: 'sent' } })
      return { id: message.id, status: 'sent' }
    } catch {
      // An accepted send can lose its response. Never auto-resend an uncertain attempt.
      await this.db.instagramMessage.updateMany({ where: { id: message.id, tenantId }, data: { status: 'unknown' } })
      return { id: message.id, status: 'unknown' }
    }
  }
}
