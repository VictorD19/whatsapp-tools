import { BadRequestException, ConflictException } from '@nestjs/common'
import { randomUUID } from 'crypto'
import { RedisService } from '@core/redis/redis.service'
import { AesCryptoService } from '@shared/crypto/aes-crypto.service'
import { InstagramAdapter, InstagramConnection, InstagramTransportError } from './instagram.adapter'
import { InstagramConfig } from './instagram.config'

const QUEUE = 'instagram:connection:due'
const LIFETIME = 3600_000
const release = 'if redis.call("get",KEYS[1])==ARGV[1] then return redis.call("del",KEYS[1]) else return 0 end'
const storePending = '-- store pending\nif redis.call("exists",KEYS[1])==1 then return 0 end; redis.call("set",KEYS[1],ARGV[1],"EX",ARGV[2]); redis.call("zadd",KEYS[2],ARGV[3],ARGV[4]); return 1'
const reschedule = '-- reschedule pending\nif redis.call("exists",KEYS[1])==0 then return 0 end; redis.call("set",KEYS[1],ARGV[1],"EX",ARGV[2]); redis.call("zadd",KEYS[2],ARGV[3],ARGV[4]); return 1'
type Pending = { version: 1; tenantId: string; userId: string; token: string; expiresAt: string | null;
  appId: string; configId: string; createdAt: number; nextAt: number; attempts: number }
export type ConnectionProgress = { state: 'none' | 'waiting'; retryAfterSeconds: number }

// No timers or plaintext tokens in queue members. Both tenant and initiating user own a pending grant.
export class InstagramConnectionManager {
  constructor(private readonly redis: RedisService, private readonly crypto: AesCryptoService,
    private readonly config: InstagramConfig, private readonly adapter: InstagramAdapter,
    private readonly persist: (tenantId: string, account: InstagramConnection) => Promise<unknown>,
    private readonly canComplete: (tenantId: string, userId: string) => Promise<boolean>) {}
  private member(tenantId: string, userId: string) { return JSON.stringify([tenantId, userId]) }
  private key(tenantId: string, userId: string) { return 'instagram:connection:' + this.member(tenantId, userId) }
  private async read(tenantId: string, userId: string): Promise<Pending | null> {
    const raw = await this.redis.getClient().get(this.key(tenantId, userId))
    if (!raw) return null
    const value = JSON.parse(this.crypto.decrypt(raw)) as Pending
    if (value.version !== 1 || value.tenantId !== tenantId || value.userId !== userId ||
      value.appId !== this.config.get('INSTAGRAM_APP_ID') || value.configId !== this.config.get('INSTAGRAM_CONFIG_ID') ||
      !Number.isFinite(value.createdAt) || value.createdAt > Date.now() + 5000 || Date.now() - value.createdAt >= LIFETIME ||
      !Number.isFinite(value.nextAt) || !Number.isInteger(value.attempts) || value.attempts < 0 || value.attempts > 5 ||
      typeof value.token !== 'string' || !value.token ||
      (value.expiresAt && (!Number.isFinite(Date.parse(value.expiresAt)) || Date.parse(value.expiresAt) <= Date.now()))) {
      await this.clear(tenantId, userId); return null
    }
    return value
  }
  private async clear(tenantId: string, userId: string) {
    await this.redis.getClient().del(this.key(tenantId, userId))
    await this.redis.getClient().zrem(QUEUE, this.member(tenantId, userId))
  }
  async progress(tenantId: string, userId: string): Promise<ConnectionProgress> {
    this.config.assertTenant(tenantId)
    const value = await this.read(tenantId, userId)
    return value ? { state: 'waiting', retryAfterSeconds: Math.max(0, Math.ceil((value.nextAt - Date.now()) / 1000)) } : { state: 'none', retryAfterSeconds: 0 }
  }
  async authorize(tenantId: string, userId: string, code: string) {
    this.config.assertTenant(tenantId); this.config.assertMeta()
    if (!await this.canComplete(tenantId, userId)) throw new BadRequestException('Administrador indisponível para esta autorização')
    // The one-use code is exchanged once. A later quota error must not discard this token.
    const authorization = await this.adapter.exchangeToken(code)
    const value: Pending = { version: 1, tenantId, userId, token: authorization.token, expiresAt: authorization.expiresAt?.toISOString() ?? null,
      appId: this.config.get('INSTAGRAM_APP_ID'), configId: this.config.get('INSTAGRAM_CONFIG_ID'), createdAt: Date.now(), nextAt: Date.now(), attempts: 0 }
    const stored = await this.redis.getClient().eval(storePending, 2, this.key(tenantId, userId), QUEUE,
      this.crypto.encrypt(JSON.stringify(value)), LIFETIME / 1000, value.nextAt, this.member(tenantId, userId))
    if (stored !== 1) throw new ConflictException('Uma autorização já está em processamento. Aguarde ou cancele antes de conectar outra conta.')
    return this.resume(tenantId, userId)
  }
  async resume(tenantId: string, userId: string): Promise<{ pending: boolean; retryAfterSeconds?: number }> {
    this.config.assertTenant(tenantId); this.config.assertMeta()
    const client = this.redis.getClient(), lock = this.key(tenantId, userId) + ':lock', claim = randomUUID()
    if (await client.set(lock, claim, 'EX', 90, 'NX') !== 'OK') return { pending: true, retryAfterSeconds: 30 }
    try {
      const value = await this.read(tenantId, userId)
      if (!value) return { pending: false }
      if (!await this.canComplete(tenantId, userId)) { await this.clear(tenantId, userId); throw new BadRequestException('A permissão do administrador mudou. Autorização temporária removida.') }
      if (value.nextAt > Date.now()) return { pending: true, retryAfterSeconds: Math.ceil((value.nextAt - Date.now()) / 1000) }
      if (value.attempts >= 5) { await this.clear(tenantId, userId); throw new BadRequestException('A Meta não liberou a conexão neste período. A autorização temporária foi removida.') }
      try {
        const account = await this.adapter.completeConnection({ token: value.token, expiresAt: value.expiresAt ? new Date(value.expiresAt) : null })
        // Cancel shares this lock. Recheck the grant before committing a connection.
        if (await client.get(lock) !== claim || !await this.read(tenantId, userId)) return { pending: false }
        if (!await this.canComplete(tenantId, userId)) { await this.clear(tenantId, userId); return { pending: false } }
        await this.persist(tenantId, account)
        await this.clear(tenantId, userId)
        return { pending: false }
      } catch (error) {
        if (!(error instanceof InstagramTransportError) || !error.retryable) { await this.clear(tenantId, userId); throw error }
        value.attempts++
        const seconds = Math.min(3600, Math.max(error.retryAfterSeconds, Math.min(1800, 300 * 2 ** (value.attempts - 1))))
        value.nextAt = Date.now() + seconds * 1000
        const ttl = Math.ceil((value.createdAt + LIFETIME - Date.now()) / 1000)
        if (ttl <= 0) { await this.clear(tenantId, userId); return { pending: false } }
        await client.eval(reschedule, 2, this.key(tenantId, userId), QUEUE,
          this.crypto.encrypt(JSON.stringify(value)), ttl, value.nextAt, this.member(tenantId, userId))
        return { pending: true, retryAfterSeconds: seconds }
      }
    } finally { await client.eval(release, 1, lock, claim) }
  }
  async cancel(tenantId: string, userId: string) {
    this.config.assertTenant(tenantId)
    const client = this.redis.getClient(), lock = this.key(tenantId, userId) + ':lock', claim = randomUUID()
    if (await client.set(lock, claim, 'EX', 90, 'NX') !== 'OK') throw new ConflictException('A conclusão está em andamento. Aguarde alguns instantes antes de cancelar.')
    try { await this.clear(tenantId, userId); return { cancelled: true } }
    finally { await client.eval(release, 1, lock, claim) }
  }
  async processDue() {
    if (!this.config.enabled() || this.config.mode !== 'meta') return
    const client = this.redis.getClient()
    const members = await client.zrangebyscore(QUEUE, '-inf', Date.now(), 'LIMIT', 0, 5)
    for (const member of members) {
      try {
        const ids = JSON.parse(member)
        if (!Array.isArray(ids) || ids.length !== 2 || ids.some(id => typeof id !== 'string') || !this.config.allowed(ids[0])) { await client.zrem(QUEUE, member); continue }
        if (!await client.get(this.key(ids[0], ids[1]))) { await client.zrem(QUEUE, member); continue }
        await this.resume(ids[0], ids[1])
      } catch { /* Bounded queue retry; never log provider responses, credentials or message content. */ }
    }
  }
}
