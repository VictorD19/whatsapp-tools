// Run inside the isolated app container. No Meta calls or outgoing messages.
const { readFileSync } = require('node:fs')

async function main() {
  const config = JSON.parse(readFileSync('/run/secrets/pilot_runtime', 'utf8'))
  const base = 'http://127.0.0.1:18012'
  const login = async (email, password) => {
    const response = await fetch(base + '/api/v1/auth/login', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }), signal: AbortSignal.timeout(20000),
    })
    const result = await response.json()
    if (response.status !== 200 || !result.data?.accessToken) throw Error('Login failed')
    return result.data
  }
  const get = async (path, token) => {
    const response = await fetch(base + path, {
      headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000),
    })
    return { status: response.status, body: await response.json() }
  }
  const owner = await login('instagram-review@example.com', config.loginPassword)
  const reviewer = await login('meta-review@example.com', config.reviewerLoginPassword)
  const status = await get('/api/v1/instagram/status', reviewer.accessToken)
  const accounts = await get('/api/v1/instagram/accounts', reviewer.accessToken)
  const checks = {
    distinctTenants: owner.user.tenant.id === 'instagram-review' && reviewer.user.tenant.id === 'instagram-meta-review',
    notSuperAdmin: reviewer.user.isSuperAdmin === false,
    reviewerEnabled: status.status === 200 && status.body.data.enabled === true,
    sendingDisabled: status.body.data.realSendingEnabled === false,
    noOwnerAccountsVisible: accounts.status === 200 && accounts.body.data.length === 0,
  }
  const owned = await get('/api/v1/instagram/accounts', owner.accessToken)
  if (owned.body.data.length) {
    const path = '/api/v1/instagram/accounts/' + encodeURIComponent(owned.body.data[0].id) + '/conversations'
    const foreign = await get(path, reviewer.accessToken)
    checks.crossTenantAccountNoData = [403, 404].includes(foreign.status) ||
      (foreign.status === 200 && Array.isArray(foreign.body.data) && foreign.body.data.length === 0)
    const conversations = await get(path, owner.accessToken)
    if (conversations.body.data.length) {
      const messagesPath = '/api/v1/instagram/conversations/' + encodeURIComponent(conversations.body.data[0].id) + '/messages'
      const ownMessages = await get(messagesPath, owner.accessToken)
      const foreignMessages = await get(messagesPath, reviewer.accessToken)
      checks.ownerMessagesReadable = ownMessages.status === 200
      checks.crossTenantMessagesDenied = [403, 404].includes(foreignMessages.status)
    }
  }
  const passed = Object.values(checks).every(Boolean)
  console.log(JSON.stringify({ checks, passed, noMetaCalls: true, noMessagesSent: true }))
  if (!passed) process.exitCode = 1
}
main().catch(() => { console.error('Isolated reviewer verification failed; no credential output.'); process.exitCode = 1 })
