// Configuration diagnostics never include values of secrets.
export const metaTemplate = () => ({
  appId: '', appSecret: '', verifyToken: '', apiVersion: '', redirectUri: '', sendEnabled: false,
})

export function metaDiagnostics(config) {
  const problems = []
  if (!config || typeof config !== 'object' || Array.isArray(config)) return ['Arquivo de configuração inválido']
  if (typeof config.appId !== 'string' || !/^\d+$/.test(config.appId)) problems.push('Identificação do aplicativo Instagram ausente ou inválida')
  if (typeof config.appSecret !== 'string' || !config.appSecret.trim()) problems.push('Segredo do aplicativo Instagram ausente')
  if (typeof config.verifyToken !== 'string' || config.verifyToken.length < 32) problems.push('Token de verificação do webhook ausente ou curto')
  if (typeof config.apiVersion !== 'string' || !/^v\d+\.\d+$/.test(config.apiVersion)) problems.push('Versão da API precisa ser confirmada no painel Meta')
  try {
    const url = new URL(config.redirectUri)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
        url.pathname !== '/api/v1/instagram/callback' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error()
  } catch { problems.push('Callback precisa de endereço HTTPS público de testes, terminado em /api/v1/instagram/callback') }
  if (typeof config.sendEnabled !== 'boolean') problems.push('sendEnabled precisa ser true ou false')
  return problems
}

export function metaEnvironment(config) {
  const problems = metaDiagnostics(config)
  if (problems.length) throw new Error('Configuração Meta incompleta:\n- ' + problems.join('\n- '))
  return {
    INSTAGRAM_MODE: 'meta', INSTAGRAM_APP_ID: config.appId, INSTAGRAM_APP_SECRET: config.appSecret,
    INSTAGRAM_VERIFY_TOKEN: config.verifyToken, INSTAGRAM_API_VERSION: config.apiVersion,
    INSTAGRAM_REDIRECT_URI: config.redirectUri, INSTAGRAM_SEND_ENABLED: String(config.sendEnabled),
  }
}
