// Loopback-only, short-lived form for moving the test-app secret into its private file.
// No credential is printed, returned by the form, or included in browser storage.
import { createServer } from 'node:http'
import { randomBytes, timingSafeEqual } from 'node:crypto'
import { readFileSync, writeFileSync, renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function createSecretSetup(file, origin = 'http://localhost:18003') {
  const nonce = randomBytes(32).toString('hex')
  return createServer(async (req, res) => {
    const respond = (code, text) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; form-action 'self'; frame-ancestors 'none'", 'X-Content-Type-Options': 'nosniff' }); res.end(text) }
    if (req.headers.host !== new URL(origin).host || req.url !== '/') return respond(404, 'Indisponível')
    if (req.method === 'GET') return respond(200, `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Conexão Meta de testes</title><h1>Chave do aplicativo de testes</h1><p>Somente ZapChat Social Lab. A chave será salva no arquivo privado deste computador.</p><form method="POST"><input type="hidden" name="nonce" value="${nonce}"><label>Chave secreta do aplicativo <input type="password" name="appSecret" autocomplete="off" required minlength="32" maxlength="32"></label><button>Salvar chave no laboratório</button></form></html>`)
    if (req.method !== 'POST' || req.headers.origin !== origin) return respond(403, 'Origem recusada')
    try {
      let body = ''
      for await (const chunk of req) { body += chunk; if (body.length > 4096) return respond(413, 'Requisição muito grande') }
      const form = new URLSearchParams(body), proof = form.get('nonce') || '', secret = form.get('appSecret') || ''
      if (proof.length !== nonce.length || !timingSafeEqual(Buffer.from(proof), Buffer.from(nonce)) || !/^[a-fA-F0-9]{32}$/.test(secret)) return respond(400, 'Dados inválidos')
      const config = JSON.parse(readFileSync(file, 'utf8'))
      const temp = file + '.new'
      writeFileSync(temp, JSON.stringify({ ...config, appSecret: secret }, null, 2), { mode: 0o600 }); renameSync(temp, file)
      respond(200, '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Chave salva</title><h1>Chave salva no laboratório</h1><p>Nenhum envio real foi habilitado. Esta janela pode ser fechada.</p></html>')
    } catch { respond(500, 'Não foi possível salvar a chave') }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const file = join(dirname(dirname(fileURLToPath(import.meta.url))), '.instagram-test/meta.json')
  const server = createSecretSetup(file)
  server.listen(18003, '127.0.0.1', () => console.log('Formulário temporário de chave local: http://localhost:18003. Nenhum segredo será exibido no terminal.'))
  const timeout = setTimeout(() => server.close(), 30 * 60 * 1000)
  timeout.unref()
}
