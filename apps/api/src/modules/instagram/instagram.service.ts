import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import { RedisService } from '@core/redis/redis.service'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'
import { randomBytes, randomInt, randomUUID } from 'crypto'
import { InstagramConfig } from './instagram.config'
import { InstagramAdapter, InstagramConnection } from './instagram.adapter'
import { InstagramConnectionManager } from './instagram.connection'
import { canReply, deletionCutoffKey, DeletedDirect, deletedDirects, IncomingDirect, incomingDirects, signatureMatches } from './instagram.policy'

const accountFields = { id: true, instagramId: true, username: true, mode: true, active: true, tokenExpiresAt: true } as const

@Injectable()
export class InstagramService {
  private connectionTimer?: ReturnType<typeof setInterval>
  constructor(private readonly db: PrismaService, private readonly redis: RedisService,
    private readonly crypto: AesCryptoService, private readonly config: InstagramConfig,
    private readonly adapter: InstagramAdapter) {}

  private connections() { return new InstagramConnectionManager(this.redis, this.crypto, this.config, this.adapter,
    (tenantId, account) => this.persistConnection(tenantId, account),
    async (tenantId, userId) => !!await this.db.user.findFirst({ where: { id: userId, tenantId, deletedAt: null,
      tenant: { deletedAt: null }, OR: [{ role: 'admin' }, { isSuperAdmin: true }] }, select: { id: true } })) }
  onModuleInit() {
    if (!this.config.enabled() || this.config.mode !== 'meta') return
    this.connectionTimer = setInterval(() => { void this.connections().processDue().catch(() => {}) }, 30_000)
    this.connectionTimer.unref()
  }
  onModuleDestroy() { if (this.connectionTimer) clearInterval(this.connectionTimer) }
  connectionProgress(tenantId: string, userId: string) { return this.connections().progress(tenantId, userId) }
  retryConnection(tenantId: string, userId: string) { return this.connections().resume(tenantId, userId) }
  cancelConnection(tenantId: string, userId: string) { return this.connections().cancel(tenantId, userId) }

  status(tenantId: string) {
    return { enabled: this.config.allowed(tenantId), mode: this.config.mode, testOnly: true,
      reviewerReplyEnabled: this.config.reviewerSendingAllowed(tenantId), realSendingEnabled: this.config.realSendingAllowed(tenantId) }
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
  async connect(tenantId: string, userId: string, useFacebookSession = false) {
    this.config.assertTenant(tenantId)
    const progress = await this.connectionProgress(tenantId, userId)
    if (progress.state === 'waiting') return { pending: true, retryAfterSeconds: progress.retryAfterSeconds }
    const state = randomBytes(32).toString('base64url')
    const url = this.adapter.authUrl(state, useFacebookSession)
    await this.redis.getClient().set(`instagram:oauth:${state}`, JSON.stringify({ tenantId, userId }), 'EX', 600, 'NX')
    return { url }
  }
  async callback(code: string, state: string) {
    this.config.assertEnabled()
    if (!/^[A-Za-z0-9_-]{43}$/.test(state || '') || !code || code.length > 2048) throw new BadRequestException('Autorização inválida')
    // Single use, including when provider exchange fails. No tenant identifiers or verifier in the URL.
    const raw = await this.redis.getClient().getdel(`instagram:oauth:${state}`)
    if (!raw) throw new BadRequestException('Autorização expirada ou já utilizada')
    const { tenantId, userId } = JSON.parse(raw) as { tenantId: string; userId: string }
    this.config.assertTenant(tenantId)
    if (!userId || typeof userId !== 'string') throw new BadRequestException('Autorização inválida')
    return this.connections().authorize(tenantId, userId, code)
  }
  private async persistConnection(tenantId: string, account: InstagramConnection) {
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
    // Process tombstones first even if Meta batches the original and cancellation
    // together. A subsequent history sync must not restore cancelled content.
    for (const event of deletedDirects(payload, Date.now())) {
      const account = await this.db.instagramAccount.findUnique({ where: { instagramId: event.accountId } })
      if (!account?.active || account.mode !== 'meta' || !this.config.allowed(account.tenantId)) continue
      await this.persistCancellation(account, event)
    }
    for (const event of incomingDirects(payload, Date.now())) {
      const account = await this.db.instagramAccount.findUnique({ where: { instagramId: event.accountId } })
      if (!account?.active || account.mode !== 'meta' || !this.config.allowed(account.tenantId)) continue
      await this.persistIncoming(account, event, event.standby ? 'standby' : 'messaging')
    }
    return { received: true }
  }
  private async persistCancellation(account: { id: string; tenantId: string }, event: DeletedDirect) {
    const cutoff = await this.redis.getClient().get(deletionCutoffKey(account.tenantId, account.id, event.participantId))
    if (cutoff != null) {
      const timestamp = Number(cutoff)
      if (!Number.isFinite(timestamp) || timestamp <= 0) throw new Error('invalid_deletion_cutoff')
      if (event.at.getTime() <= timestamp) return
    }
    await this.db.$transaction(async tx => {
      const conversation = await tx.instagramConversation.upsert({
        where: { accountId_participantId: { accountId: account.id, participantId: event.participantId } },
        create: { accountId: account.id, tenantId: account.tenantId, participantId: event.participantId }, update: {},
      })
      // The unique account/message key serializes a concurrent original insert.
      // Keep only an empty tombstone, including when cancellation arrives first.
      const created = await tx.instagramMessage.createMany({ data: [{ tenantId: account.tenantId, accountId: account.id,
        conversationId: conversation.id, direction: event.direction, providerMessageId: event.messageId,
        text: '', status: 'unsent', sentAt: event.at }], skipDuplicates: true })
      const removed = await tx.instagramMessage.updateMany({ where: { tenantId: account.tenantId, accountId: account.id,
        conversationId: conversation.id, direction: event.direction, providerMessageId: event.messageId,
        status: { notIn: ['unsent', 'deleted'] } }, data: { text: '', status: 'unsent' } })
      if (created.count || removed.count) await tx.instagramConversation.updateMany({
        where: { id: conversation.id, tenantId: account.tenantId }, data: { updatedAt: new Date() },
      })
    })
  }
  private async persistIncoming(account: { id: string; tenantId: string }, event: IncomingDirect, channel?: 'messaging' | 'standby') {
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
      // Keep provider delivery state separate from API history. Polling must not
      // grant ownership, and late/repeated events must not clear a passive state.
      if (channel) await tx.instagramConversation.updateMany({ where: { id: conversation.id, tenantId: account.tenantId,
        OR: [{ lastWebhookMessageAt: null }, { lastWebhookMessageAt: { lt: event.at } },
          ...(channel === 'standby' ? [{ lastWebhookMessageAt: event.at, lastWebhookChannel: { not: 'standby' } }] : [])] },
        data: { lastWebhookChannel: channel, lastWebhookMessageAt: event.at } })
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
  async simulateCancellation(tenantId: string, messageId: string) {
    this.config.assertSimulated(tenantId)
    const message = await this.db.instagramMessage.findFirst({ where: { id: messageId, tenantId, direction: 'in' } })
    if (!message?.providerMessageId) throw new NotFoundException('Mensagem de teste indisponível')
    const account = await this.account(tenantId, message.accountId)
    if (account.mode !== 'simulated') throw new BadRequestException('Escolha uma conta simulada')
    const conversation = await this.conversation(tenantId, message.conversationId)
    await this.persistCancellation(account, { accountId: account.instagramId, participantId: conversation.participantId,
      messageId: message.providerMessageId, direction: 'in', at: new Date() })
    return { cancelled: true }
  }
  conversations(tenantId: string, accountId: string) {
    this.config.assertTenant(tenantId)
    return this.db.instagramConversation.findMany({ where: { tenantId, accountId }, take: 50, orderBy: { updatedAt: 'desc' },
      select: { id: true, participantId: true, lastInboundAt: true, lastWebhookChannel: true, updatedAt: true } })
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
  async deleteMessage(tenantId: string, messageId: string) {
    this.config.assertTenant(tenantId)
    return this.db.$transaction(async tx => {
      const message = await tx.instagramMessage.findFirst({ where: { id: messageId, tenantId } })
      if (!message) throw new NotFoundException('Mensagem Instagram indisponível')
      const account = await tx.instagramAccount.findFirst({ where: { id: message.accountId, tenantId, active: true, mode: this.config.mode } })
      if (!account) throw new NotFoundException('Conta Instagram indisponível')
      if (message.status === 'deleted') return { deleted: true }
      // Preserve uncertain send attempts for reconciliation; erasing them could
      // remove the information needed to prevent a duplicate outbound send.
      if (!['received', 'sent', 'unsent'].includes(message.status)) throw new ConflictException('Confira o envio sem confirmação antes de excluir esta mensagem')
      const removed = await tx.instagramMessage.updateMany({
        where: { id: messageId, tenantId, accountId: message.accountId, conversationId: message.conversationId,
          status: { in: ['received', 'sent', 'unsent'] } },
        data: { text: '', status: 'deleted' },
      })
      if (!removed.count) throw new ConflictException('A mensagem mudou. Atualize a conversa antes de excluir')
      // Retain the unique provider/request IDs as an empty tombstone so late
      // webhooks/history and HTTP retries cannot recreate the erased content.
      await tx.instagramConversation.updateMany({ where: { id: message.conversationId, tenantId, accountId: message.accountId }, data: { updatedAt: new Date() } })
      return { deleted: true }
    })
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
    if (conversation.lastWebhookChannel === 'standby') throw new ForbiddenException('Conversa recebida em espera: somente leitura enquanto outro aplicativo tem o controle')
    if (!canReply(conversation.lastInboundAt, Date.now())) throw new BadRequestException('A janela de resposta de 24 horas terminou')
    if (account.mode === 'meta' && (!account.accessToken || (account.tokenExpiresAt && account.tokenExpiresAt.getTime() <= Date.now()))) throw new BadRequestException('Reconecte o Instagram: autorização ausente ou expirada')
    if (account.mode === 'meta' && !this.config.replyTargetAllowed(tenantId, account.instagramId, conversation.participantId)) throw new ForbiddenException('Envio real desabilitado para esta conversa no piloto')
    // Unique request ID plus atomic claim prevents concurrent HTTP retries sending twice.
    const message = await this.db.instagramMessage.upsert({ where: { accountId_requestId: { accountId: account.id, requestId } },
      create: { tenantId, accountId: account.id, conversationId, direction: 'out', text, requestId, status: 'pending' }, update: {} })
    if (message.conversationId !== conversationId || message.text !== text) throw new ConflictException('Identificador já utilizado')
    const claim = await this.db.instagramMessage.updateMany({ where: { id: message.id, tenantId, status: 'pending' }, data: { status: 'sending' } })
    if (!claim.count) return { id: message.id, status: message.status }
    try {
      this.config.assertTenant(tenantId)
      const current = await this.account(tenantId, account.id)
      const currentConversation = await this.conversation(tenantId, conversationId)
      if (currentConversation.lastWebhookChannel === 'standby') throw new Error('passive_conversation')
      if (current.mode !== this.config.mode || (current.mode === 'meta' && (!current.accessToken ||
          (current.tokenExpiresAt && current.tokenExpiresAt.getTime() <= Date.now())))) throw new Error('connection_changed')
      if (!canReply(currentConversation.lastInboundAt, Date.now())) throw new Error('reply_window_closed')
      if (current.mode === 'meta' && !this.config.replyTargetAllowed(tenantId, current.instagramId, currentConversation.participantId)) throw new Error('reply_target_disabled')
      const token = current.accessToken ? this.crypto.decrypt(current.accessToken) : null
      const providerMessageId = await this.adapter.sendText(current.instagramId, currentConversation.participantId, token, text, tenantId)
      await this.db.instagramMessage.updateMany({ where: { id: message.id, tenantId }, data: { providerMessageId, status: 'sent' } })
      return { id: message.id, status: 'sent' }
    } catch {
      // An accepted send can lose its response. Never auto-resend an uncertain attempt.
      await this.db.instagramMessage.updateMany({ where: { id: message.id, tenantId }, data: { status: 'unknown' } })
      return { id: message.id, status: 'unknown' }
    }
  }
}
