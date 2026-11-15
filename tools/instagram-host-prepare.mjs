// Generates a new isolated deployment's private material; never copies a database or account token.
import { randomBytes } from 'node:crypto'
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { metaDiagnostics } from './instagram-meta-config.mjs'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const dir = resolve(process.argv[2] || '')
if (!process.argv[2]) throw Error('Choose a private directory outside source control')
if (existsSync(resolve(dir, 'runtime.json'))) throw Error('Existing deployment credentials are preserved; choose a new private directory')
const fixtures = process.argv.includes('--fixtures')
const secret = () => randomBytes(32).toString('hex')
const meta = fixtures ? { appId: '123', configId: '456', appSecret: secret(), verifyToken: secret(), apiVersion: 'v27.0',
  redirectUri: 'https://instagram-review.sistemazapchat.com/api/v1/instagram/callback', sendEnabled: false }
  : JSON.parse(readFileSync(resolve(root, '.instagram-test/reviewer/meta.json'), 'utf8'))
if (metaDiagnostics(meta).length || meta.sendEnabled !== false || meta.redirectUri !== 'https://instagram-review.sistemazapchat.com/api/v1/instagram/callback') throw Error('Unexpected pilot Meta configuration')
mkdirSync(dir, { recursive: true, mode: 0o700 })
const password = secret()
const runtime = { version: 1, fixture: fixtures, databaseUrl: `postgresql://instagram_review:${password}@postgres:5432/instagram_review?schema=public`,
  jwt: secret(), refresh: secret(), encryption: randomBytes(16).toString('hex'), backupKey: secret(), loginPassword: secret(), meta }
writeFileSync(resolve(dir, 'runtime.json'), JSON.stringify(runtime), { mode: 0o600 })
writeFileSync(resolve(dir, 'db-password'), password, { mode: 0o600 })
// Empty until a NEW dedicated tunnel is created. Never reuse the original tunnel token.
writeFileSync(resolve(dir, 'cloudflared.token'), '', { mode: 0o600 })
console.log(JSON.stringify({ prepared: true, directory: dir, fixtures, copiedCustomerData: false, copiedAccountToken: false, publicTunnelConfigured: false }))
