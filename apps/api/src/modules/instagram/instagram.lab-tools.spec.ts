import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

// Include the standalone lab tool's safety suite in the existing API test job.
// The child suite uses fixtures only: no database, credentials or Meta calls.
describe('Instagram lab reconciliation safety suite', () => {
  it('passes its bounded scheduling, tenant and no-send checks', () => {
    const root = resolve(__dirname, '../../../../..')
    execFileSync(process.execPath, ['--test', resolve(root, 'tools/instagram-lab-reconcile.test.mjs')], {
      cwd: root, encoding: 'utf8', timeout: 10_000,
    })
  })
})
