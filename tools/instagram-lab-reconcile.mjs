// Temporary API reconciliation for the isolated lab. This is NOT webhook delivery.
import { readFile, writeFile, open, unlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

export const INTERVAL = 5 * 60_000
export const ERROR_PAUSE = 30 * 60_000
const HOUR = 60 * 60_000
const BASE = 'http://127.0.0.1:18001/api/v1/'
const TARGET = '17841400699000476'

export async function reconcileOnce({ state, now = Date.now(), request, password, save }) {
  if (state.version !== 1 || !Array.isArray(state.attempts) ||
      state.attempts.some(t => !Number.isFinite(t) || t > now) ||
      !Number.isFinite(state.nextAttemptAt)) throw new Error('Invalid reconciliation state; inspect locally')
  if (now < state.nextAttemptAt) return { skipped: true, nextAttemptAt: state.nextAttemptAt }
  state.attempts = state.attempts.filter(t => now - t < HOUR)
  if (state.attempts.length >= 12) {
    state.nextAttemptAt = Math.min(...state.attempts) + HOUR
    await save(state)
    return { skipped: true, nextAttemptAt: state.nextAttemptAt }
  }
  // Persist the budget BEFORE login/provider work, including failed attempts/restarts.
  state.attempts.push(now)
  state.nextAttemptAt = now + INTERVAL
  await save(state)
  let stage = 'login'
  try {
    const login = await request('auth/login', 'POST', { email: 'instagram-lab@example.com', password })
    if (login.user?.tenant?.id !== 'instagram-lab' || login.user?.role !== 'admin' ||
        login.user?.isSuperAdmin !== false || !login.accessToken) throw new Error('Lab identity mismatch')
    const token = login.accessToken
    stage = 'status_guard'
    const status = await request('instagram/status', 'GET', undefined, token)
    if (status.enabled !== true || status.mode !== 'meta' || status.testOnly !== true ||
        status.realSendingEnabled !== false) throw new Error('Lab safety guard failed')
    stage = 'accounts_guard'
    const accounts = await request('instagram/accounts', 'GET', undefined, token)
    const matches = accounts.filter(a => a.instagramId === TARGET && a.username === 'joaobosco.pro' && a.active && a.mode === 'meta')
    if (matches.length !== 1 || !/^[A-Za-z0-9_-]{1,100}$/.test(matches[0].id)) throw new Error('Pilot account mismatch')
    stage = 'sync'
    const result = await request(`instagram/accounts/${matches[0].id}/sync`, 'POST', {}, token)
    state.lastResult = result.synchronized === true ? 'api_reconciliation' : 'server_cooldown'
    state.lastProcessed = Number.isSafeInteger(result.processed) ? result.processed : 0
    state.lastAttemptAt = now
    delete state.lastErrorStage
  } catch {
    // Never log a provider response, password, access token or message text.
    state.lastResult = 'error_paused'
    state.lastProcessed = 0
    state.lastAttemptAt = now
    state.lastErrorStage = stage
    state.nextAttemptAt = now + ERROR_PAUSE
  }
  await save(state)
  return { mode: state.lastResult, processed: state.lastProcessed, nextAttemptAt: state.nextAttemptAt }
}

export async function localRequest(path, method = 'GET', body, token) {
  if (!/^(auth\/login|instagram\/status|instagram\/accounts|instagram\/accounts\/[A-Za-z0-9_-]+\/sync)$/.test(path)) throw new Error('Route outside lab reconciliation')
  const response = await fetch(BASE + path, {
    method, redirect: 'error', signal: AbortSignal.timeout(75_000),
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Local lab request failed')
  const result = await response.json()
  if (result.data === undefined) throw new Error('Invalid local lab response')
  return result.data
}

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Production forbidden')
  const action = process.argv[2] || 'status'
  if (!['status', 'once', 'run'].includes(action)) throw new Error('Use status, once or run')
  const folder = join(dirname(dirname(fileURLToPath(import.meta.url))), '.instagram-test')
  const statePath = join(folder, 'reconcile-state.json')
  let state
  try { state = JSON.parse(await readFile(statePath, 'utf8')) }
  catch (error) { if (error.code !== 'ENOENT') throw error; state = { version: 1, attempts: [], nextAttemptAt: 0 } }
  if (action === 'status') { console.log(JSON.stringify(state)); return }
  const lockPath = join(folder, 'reconcile.lock')
  const lock = await open(lockPath, 'wx', 0o600)
  await lock.writeFile(String(process.pid))
  await lock.close()
  const stop = new AbortController()
  process.once('SIGTERM', () => stop.abort())
  process.once('SIGINT', () => stop.abort())
  try {
    const session = JSON.parse(await readFile(join(folder, 'session.json'), 'utf8'))
    if (typeof session.password !== 'string' || !session.password) throw new Error('Missing local lab session')
    const save = value => writeFile(statePath, JSON.stringify(value, null, 2), { mode: 0o600 })
    do {
      const result = await reconcileOnce({ state, request: localRequest, password: session.password, save })
      console.log(JSON.stringify({ at: new Date().toISOString(), source: 'api_reconciliation_not_webhook', ...result }))
      if (action === 'once' || stop.signal.aborted) break
      await delay(Math.max(1000, state.nextAttemptAt - Date.now()), undefined, { signal: stop.signal }).catch(error => {
        if (error.name !== 'AbortError') throw error
      })
    } while (!stop.signal.aborted)
  } finally { await unlink(lockPath) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => { console.error('Reconciliação interrompida. Confira o estado/lock local sem expor credenciais.'); process.exitCode = 1 })
}
