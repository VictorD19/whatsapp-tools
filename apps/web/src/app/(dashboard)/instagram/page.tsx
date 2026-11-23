'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'
import dynamic from 'next/dynamic'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { instagramSections, InstagramSection, InstagramPreviewSection, isInstagramSection } from '@/components/instagram/sections'

const InstagramPrototypePreview = dynamic(() => import('@/components/instagram/InstagramPrototypePreview'), {
  ssr: false, loading: () => <p role="status">Abrindo a prévia do protótipo…</p>,
})

type Account = { id: string; username: string; mode: string; active: boolean; tokenExpiresAt: string | null }
type Conversation = { id: string; participantId: string; lastInboundAt: string | null; lastWebhookChannel?: string; updatedAt: string }
type Message = { id: string; direction: string; text: string; status: string; sentAt: string }
type Status = { enabled: boolean; mode: 'simulated' | 'meta'; testOnly: boolean; realSendingEnabled: boolean; reviewerReplyEnabled?: boolean }
type ConnectionProgress = { state: 'none' | 'waiting'; retryAfterSeconds: number }
const panel = 'rounded-xl border bg-card p-5 space-y-4'
const button = 'rounded-md border px-4 py-2 text-sm disabled:opacity-40'
const field = 'w-full rounded-md border bg-background px-3 py-2 text-sm'
const restrictedReview = process.env.NEXT_PUBLIC_INSTAGRAM_REVIEW_FIXTURES === 'true'

export default function InstagramPage() {
  const [section, setSection] = useState<InstagramSection>('conversas')
  const [previewSection, setPreviewSection] = useState<InstagramPreviewSection>('automacoes')
  const [previewOpened, setPreviewOpened] = useState(false)
  const navigateSection = useCallback((next: InstagramSection) => {
    setSection(next)
    if (instagramSections.find(item => item.id === next)?.preview) {
      setPreviewOpened(true); setPreviewSection(next as InstagramPreviewSection)
    }
    window.history.replaceState(null, '', `#${next}`)
  }, [])
  useEffect(() => {
    const change = () => { const value = window.location.hash.slice(1); if (isInstagramSection(value)) navigateSection(value) }
    change(); window.addEventListener('hashchange', change)
    return () => window.removeEventListener('hashchange', change)
  }, [navigateSection])
  const [status, setStatus] = useState<Status | null>(null)
  const [connectionProgress, setConnectionProgress] = useState<ConnectionProgress>({ state: 'none', retryAfterSeconds: 0 })
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Message | null>(null)
  const [text, setText] = useState('')
  const [incoming, setIncoming] = useState('Olá! Gostaria de saber mais.')
  const [error, setError] = useState('')
  const [inboxError, setInboxError] = useState('')
  const [connectionError, setConnectionError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const selected = useRef('')
  const activeAccount = useRef('')
  const refreshing = useRef(false)
  const inboxRevision = useRef<string | null>(null)
  const messageEpoch = useRef(0)
  const attempt = useRef<{ conversationId: string; text: string; id: string } | null>(null)
  const account = accounts.find(a => a.id === accountId)
  const conversation = conversations.find(c => c.id === conversationId)
  const lastInbound = conversation?.lastInboundAt ? Date.parse(conversation.lastInboundAt) : 0
  const withinWindow = lastInbound > 0 && Date.now() - lastInbound < 86400000
  const uncertain = messages.some(m => m.status === 'unknown' || m.status === 'sending')

  const loadAccounts = useCallback(async () => {
    const result = await apiGet<{ data: Account[] }>('instagram/accounts')
    setAccounts(result.data)
    setAccountId(previous => result.data.some(a => a.id === previous && a.active) ? previous : result.data.find(a => a.active)?.id || '')
  }, [])
  const refreshConnection = useCallback(async () => {
    const result = await apiGet<{ data: ConnectionProgress }>('instagram/connection')
    setConnectionProgress(result.data)
    if (result.data.state === 'none') await loadAccounts()
  }, [loadAccounts])
  const startConnection = async (useFacebookSession = false) => {
    const result = await apiGet<{ data: { url?: string; pending?: boolean } }>(`instagram/connect${useFacebookSession ? '?login=facebook' : ''}`)
    if (result.data.pending) { await refreshConnection(); return }
    if (result.data.url) window.location.assign(result.data.url)
  }
  const loadConversations = useCallback(async (id: string) => {
    const result = await apiGet<{ data: Conversation[] }>(`instagram/accounts/${encodeURIComponent(id)}/conversations`)
    return result.data
  }, [])
  const refreshInbox = useCallback(async () => {
    if (!accountId || refreshing.current) return
    refreshing.current = true
    try {
      const data = await loadConversations(accountId)
      if (activeAccount.current !== accountId) return
      setConversations(data)
      setConversationId(previous => data.some(c => c.id === previous) ? previous : data[0]?.id || '')
      const id = selected.current
      if (id && data.some(c => c.id === id)) {
        const revision = data.find(c => c.id === id)!.updatedAt
        const changed = inboxRevision.current !== revision
        if (changed) { messageEpoch.current++; setMessages([]); setHasMore(false) }
        const epoch = messageEpoch.current
        const result = await apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(id)}/messages`)
        if (activeAccount.current === accountId && selected.current === id && messageEpoch.current === epoch) {
          inboxRevision.current = revision
          setMessages(previous => {
            if (!result.data.length) return []
            // Discard older cached pages after a mutation: they may still contain
            // text removed by an unsend outside the newest 50-message page.
            if (changed) return [...result.data].reverse()
            const byId = new Map(previous.map(message => [message.id, message]))
            for (const message of result.data) byId.set(message.id, message)
            return [...byId.values()].sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id))
          })
          if (changed) setHasMore(result.data.length === 50)
        }
      }
    } finally { refreshing.current = false }
  }, [accountId, loadConversations])
  const syncInbox = useCallback(async () => {
    if (!accountId) return
    let syncError: unknown
    try { if (status?.mode === 'meta') await apiPost(`instagram/accounts/${encodeURIComponent(accountId)}/sync`, {}) }
    catch (err) { syncError = err }
    await refreshInbox()
    if (syncError) throw syncError
  }, [accountId, status?.mode, refreshInbox])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const result = await apiGet<{ data: Status }>('instagram/status')
        if (cancelled) return
        setStatus(result.data)
        if (result.data.enabled) await loadAccounts()
      } catch { if (!cancelled) setError('O piloto Instagram não está habilitado para sua empresa neste ambiente.') }
      finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [loadAccounts])
  useEffect(() => {
    if (!status?.enabled || status.mode !== 'meta') return
    let cancelled = false
    const refresh = async () => {
      try {
        const result = await apiGet<{ data: ConnectionProgress }>('instagram/connection')
        if (cancelled) return
        setConnectionProgress(result.data)
        if (result.data.state === 'none') await loadAccounts()
        if (!cancelled) setConnectionError('')
      } catch { if (!cancelled) setConnectionError('Não foi possível consultar a conexão em processamento.') }
    }
    void refresh()
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 10_000)
    return () => { cancelled = true; window.clearInterval(timer) }
  }, [status?.enabled, status?.mode, loadAccounts])
  useEffect(() => {
    let cancelled = false
    activeAccount.current = accountId
    setConversations([]); setConversationId(''); setMessages([]); selected.current = ''
    setInboxError('')
    const show = (data: Conversation[]) => {
      if (cancelled) return
      setInboxError('')
      setConversations(data)
      setConversationId(previous => data.some(c => c.id === previous) ? previous : data[0]?.id || '')
    }
    if (accountId) loadConversations(accountId).then(show)
      .catch(() => { if (!cancelled) setInboxError('Não foi possível carregar as conversas.') })
    return () => { cancelled = true }
  }, [accountId, loadConversations])
  useEffect(() => {
    if (!accountId || status?.mode !== 'meta') return
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      // UI refresh reads only our database. It never polls the Meta API.
      void refreshInbox().then(() => { if (activeAccount.current === accountId) setInboxError('') })
        .catch(() => { if (activeAccount.current === accountId) setInboxError('Não foi possível atualizar as conversas salvas. Tentando novamente…') })
    }, 3000)
    return () => window.clearInterval(timer)
  }, [accountId, status?.mode, refreshInbox])
  useEffect(() => {
    let cancelled = false
    selected.current = conversationId
    messageEpoch.current++
    inboxRevision.current = null
    const epoch = messageEpoch.current
    setMessages([]); setText(''); attempt.current = null; setHasMore(false); setDeleteTarget(null)
    if (conversationId) apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(conversationId)}/messages`).then(result => {
      if (!cancelled && epoch === messageEpoch.current) { setMessages([...result.data].reverse()); setHasMore(result.data.length === 50) }
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar as mensagens.') })
    return () => { cancelled = true }
  }, [conversationId])

  async function action(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await work() } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir. Tente atualizar a tela.') }
    finally { setBusy(false) }
  }
  async function refreshMessages(id: string) {
    const epoch = messageEpoch.current
    const result = await apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(id)}/messages`)
    if (selected.current === id && messageEpoch.current === epoch) { setMessages([...result.data].reverse()); setHasMore(result.data.length === 50) }
  }
  async function confirmDelete() {
    const target = deleteTarget, id = conversationId
    if (!target || !id) return
    await action(async () => {
      await apiDelete(`instagram/messages/${encodeURIComponent(target.id)}`)
      if (selected.current === id) {
        // Invalidate reads started before deletion, including older-page loads.
        // They must never put the erased message text back into the inbox.
        messageEpoch.current++; inboxRevision.current = null
        setMessages(previous => previous.map(message => message.id === target.id ? { ...message, text: '', status: 'deleted' } : message))
        setNotice('Conteúdo excluído desta base do CRM. A cópia no Instagram não foi alterada.')
      }
      setDeleteTarget(null)
    })
  }
  async function send(event: FormEvent) {
    event.preventDefault()
    const id = conversationId, value = text.trim()
    if (!id || !value) return
    await action(async () => {
      if (!attempt.current || attempt.current.conversationId !== id || attempt.current.text !== value) attempt.current = { conversationId: id, text: value, id: crypto.randomUUID() }
      const result = await apiPost<{ data: { status: string } }>(`instagram/conversations/${encodeURIComponent(id)}/reply`, { text: value, requestId: attempt.current.id })
      if (selected.current === id) {
        if (result.data.status === 'sent') { setText(''); attempt.current = null; setNotice(status?.mode === 'simulated' ? 'Resposta simulada. Nenhuma mensagem foi enviada ao Instagram.' : 'Resposta confirmada pela Meta.') }
        else setNotice('Envio sem confirmação final. Confira a conversa no Instagram antes de tentar outro envio.')
      }
      await refreshMessages(id)
    })
  }

  if (process.env.NEXT_PUBLIC_INSTAGRAM_PILOT !== 'true') return <div className="p-8">Piloto Instagram indisponível neste ambiente.</div>
  if (loading) return <div className="p-8" role="status">Carregando Instagram…</div>
  return <div className="mx-auto max-w-6xl space-y-6 p-6">
    <header><p className="text-sm text-muted-foreground">AMBIENTE DE TESTES</p><h1 className="text-2xl font-semibold">Instagram</h1><p className="mt-2 text-muted-foreground">{restrictedReview ? (status?.reviewerReplyEnabled ? 'Conecte sua própria conta profissional, receba um Direct e responda dentro da janela de 24 horas. A importação de histórico e respostas de IA estão desativadas.' : status?.realSendingEnabled ? 'Acompanhe os Directs recebidos e responda ao contato autorizado para esta demonstração. A importação de histórico está desativada.' : 'Conecte sua conta profissional e acompanhe as mensagens recebidas pelo Direct. Respostas e importação de histórico estão desativadas nesta etapa.') : 'Primeira etapa: receber mensagens do Direct e responder manualmente. Seus atendimentos WhatsApp ficam separados.'}</p></header>
    {process.env.NEXT_PUBLIC_INSTAGRAM_REVIEW_FIXTURES === 'true' && <p role="note" className="rounded-lg border p-4">{status?.mode === 'meta' ? (status.reviewerReplyEnabled ? 'Avaliação Meta isolada: respostas manuais somente na conta conectada a esta empresa, por prazo limitado.' : status.realSendingEnabled ? 'Demonstração controlada: resposta manual restrita ao contato autorizado. Respostas de IA desabilitadas.' : 'Ambiente de avaliação isolado. Envio real e respostas de IA desabilitados.') : 'Demonstração local · mensagens fictícias. Este ambiente não comprova entrega real de webhooks da Meta.'}</p>}
    {[error, inboxError, connectionError].filter(Boolean).map(message => <div key={message} className="rounded-lg border border-red-300 p-4" role="alert">{message}</div>)}
    {notice && <div className="rounded-lg border p-4" role="status">{notice}</div>}
    {status?.enabled && <>
      <nav role="tablist" aria-label="Seções do Instagram" className="flex flex-wrap gap-2 border-b pb-4">
        {instagramSections.map((item, index) => <button key={item.id} role="tab" id={`instagram-tab-${item.id}`}
          aria-label={item.preview ? `${item.label} — prévia` : item.label}
          aria-selected={section === item.id} aria-controls="instagram-section" tabIndex={section === item.id ? 0 : -1}
          className={`${button} ${section === item.id ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
          onClick={() => navigateSection(item.id)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (index + 1) % instagramSections.length : event.key === 'ArrowLeft' ? (index + instagramSections.length - 1) % instagramSections.length
              : event.key === 'Home' ? 0 : event.key === 'End' ? instagramSections.length - 1 : -1
            if (next < 0) return
            event.preventDefault(); navigateSection(instagramSections[next].id)
            document.getElementById(`instagram-tab-${instagramSections[next].id}`)?.focus()
          }}>{item.label}{item.preview && <span className="ml-2 text-xs opacity-75">Prévia</span>}</button>)}
      </nav>
      <div id="instagram-section" role="tabpanel" aria-labelledby={`instagram-tab-${section}`} className="space-y-6">
      {section === 'conexao' && <section className={panel}>
        <h2 className="font-semibold">Conexão {status.mode === 'simulated' ? 'simulada' : 'com a Meta'}</h2>
        <p className="text-sm text-muted-foreground">{status.mode === 'simulated' ? 'Use uma conta fictícia para testar o percurso sem acessar o Instagram.' : 'Cada empresa conecta sua própria conta profissional. Na Meta, você autoriza a identificação do perfil e a leitura e resposta aos Directs. Escolha somente o Instagram que deseja atender nesta empresa. Se ele estiver vinculado a uma Página do Facebook, use Continuar com Facebook e selecione também essa Página quando solicitada. Contas de anúncios podem ficar em branco. A disponibilidade de respostas é indicada na aba Conversas; a autorização da Meta não ativa os envios por si só.'}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className={button} disabled={busy || connectionProgress.state === 'waiting'} onClick={() => action(async () => {
            if (status.mode === 'simulated') { await apiPost('instagram/simulated-account', {}); await loadAccounts() }
            else { await startConnection() }
          })}>{status.mode === 'simulated' ? 'Criar conta de teste' : 'Conectar Instagram'}</button>
          {status.mode === 'meta' && <button className={button} disabled={busy || connectionProgress.state === 'waiting'} onClick={() => action(() => startConnection(true))}>Continuar com Facebook</button>}
          <label className="text-sm">Conta<select className={field} value={accountId} disabled={busy} onChange={e => setAccountId(e.target.value)}><option value="">Escolha uma conta</option>{accounts.filter(a => a.active).map(a => <option key={a.id} value={a.id}>@{a.username} · {a.mode === 'simulated' ? 'simulação' : 'Meta'}</option>)}</select></label>
          {account && <button className={button} disabled={busy} onClick={() => action(async () => { await apiDelete(`instagram/accounts/${encodeURIComponent(account.id)}`); await loadAccounts() })}>Desconectar neste ambiente</button>}
        </div>
        {connectionProgress.state === 'waiting' && <div role="status" className="rounded-lg border p-4 space-y-3">
          <p>Autorização recebida. A Meta limitou uma consulta; a configuração será retomada automaticamente, mesmo com esta aba fechada. Você não precisa fazer login novamente.</p>
          <p className="text-sm">Próxima tentativa em aproximadamente {Math.max(1, Math.ceil(connectionProgress.retryAfterSeconds / 60))} minuto(s). A autorização temporária expira em até uma hora.</p>
          <button className={button} disabled={busy || connectionProgress.retryAfterSeconds > 0} onClick={() => action(async () => { await apiPost('instagram/connection/retry', {}); await refreshConnection() })}>Retomar configuração</button>
          <button className={button} disabled={busy} onClick={() => action(async () => { await apiDelete('instagram/connection'); await refreshConnection() })}>Cancelar autorização pendente</button>
        </div>}
      </section>}
      {section === 'simulador' && status.mode === 'simulated' && account && <section className={panel}><h2 className="font-semibold">Laboratório do piloto · mensagem fictícia</h2><form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); action(async () => {
        await apiPost('instagram/simulate-inbound', { accountId, participantId: '123456789', text: incoming })
        const data = await loadConversations(accountId); setConversations(data); const id = data[0]?.id || ''; setConversationId(id); if (selected.current === id) await refreshMessages(id)
      }) }}><label className="grow text-sm">Mensagem do contato<input className={field} value={incoming} onChange={e => setIncoming(e.target.value)} maxLength={1000} required /></label><button className={button} disabled={busy}>Receber mensagem fictícia</button></form></section>}
      {section === 'conversas' && <>
      <p className="text-sm text-muted-foreground">{account ? `Conta selecionada: @${account.username}.` : 'Nenhuma conta selecionada. Abra Conexão para conectar seu Instagram.'}</p>
      <section className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={panel}><h2 className="font-semibold">Conversas</h2><button className={button} disabled={!accountId || busy} onClick={() => action(refreshInbox)}>Atualizar</button>{status.mode === 'meta' && !restrictedReview && <button className={button} disabled={!accountId || busy} onClick={() => action(syncInbox)}>Sincronizar com Instagram</button>}<p className="text-xs text-muted-foreground">Até 50 conversas recentes neste piloto.</p>{status.mode === 'meta' && <p className="text-xs text-muted-foreground">O receptor de webhook funciona com esta aba fechada. Aqui, as conversas salvas atualizam a cada 3 segundos. {restrictedReview ? 'A importação de histórico está desativada no ambiente de avaliação.' : 'Sincronizar com Instagram consulta manualmente até 3 conversas recentes, após a conexão e nas últimas 24 horas.'}</p>}{!conversations.length && <p className="text-sm">Nenhuma mensagem recebida.</p>}{conversations.map(c => <button className={`${button} block w-full text-left ${conversationId === c.id ? 'bg-muted' : ''}`} key={c.id} onClick={() => setConversationId(c.id)}>Contato {c.participantId}<span className="block text-xs text-muted-foreground">Direct do Instagram</span></button>)}</aside>
        <div className={panel}><h2 className="font-semibold">{conversation ? `Contato ${conversation.participantId}` : 'Selecione uma conversa'}</h2>
          {conversation?.lastWebhookChannel === 'standby' && <p className="text-sm text-muted-foreground">Recebida pelo canal de espera. Somente leitura enquanto outro aplicativo controla a conversa.</p>}
          {conversation?.lastWebhookChannel === 'history' && <p role="note" className="rounded-lg border p-3 text-sm">Histórico consultado na Meta. Este registro não comprova recebimento por webhook.</p>}
          {hasMore && <button className={button} disabled={busy} onClick={() => action(async () => { const id = conversationId, epoch = messageEpoch.current; const result = await apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(id)}/messages?before=${encodeURIComponent(messages[0].id)}`); if (selected.current === id && epoch === messageEpoch.current) { setMessages(previous => [...result.data].reverse().concat(previous)); setHasMore(result.data.length === 50) } })}>Mensagens anteriores</button>}
          <div className="max-h-96 min-h-40 space-y-3 overflow-y-auto" aria-live="polite">{messages.map(m => <div key={m.id} className={`max-w-[90%] whitespace-pre-wrap rounded-lg p-3 text-sm ${m.direction === 'out' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}>
            {m.status === 'deleted' ? 'Mensagem excluída do CRM' : m.status === 'unsent' ? 'Mensagem cancelada pelo remetente' : m.text}
            <span className="mt-2 block text-xs opacity-75">{m.direction === 'in' ? 'Contato' : 'Atendente'} · {new Date(m.sentAt).toLocaleString('pt-BR')} · {m.status === 'deleted' ? 'Excluída do CRM' : m.status === 'unsent' ? 'Cancelada' : m.status === 'received' ? 'Recebida' : m.status === 'sent' ? 'Enviada' : 'Sem confirmação final'}</span>
            {['received', 'sent'].includes(m.status) && <button className="mt-2 block underline" disabled={busy} onClick={() => setDeleteTarget(m)}>Excluir do CRM</button>}
            {status.mode === 'simulated' && m.direction === 'in' && !['unsent', 'deleted'].includes(m.status) && <button className="mt-2 block underline" disabled={busy} onClick={() => action(async () => { await apiPost(`instagram/messages/${encodeURIComponent(m.id)}/simulate-cancellation`, {}); await refreshInbox() })}>Simular cancelamento</button>}
          </div>)}</div>
          <form className="space-y-3" onSubmit={send}><label className="block text-sm">Sua resposta<textarea className={field} value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={1000} required disabled={!conversation || conversation.lastWebhookChannel === 'standby' || busy || uncertain || (status.mode === 'meta' && !status.realSendingEnabled)} /></label><button className={button} disabled={!conversation || conversation.lastWebhookChannel === 'standby' || busy || uncertain || !withinWindow || (status.mode === 'meta' && !status.realSendingEnabled)}>{busy ? 'Processando…' : status.mode === 'simulated' ? 'Responder na simulação' : 'Enviar resposta'}</button><p className="text-xs text-muted-foreground">{uncertain ? 'Existe um envio pendente ou incerto. Verifique antes de enviar novamente.' : status.mode === 'meta' && !status.realSendingEnabled ? 'Envios reais desativados nesta etapa de avaliação.' : !withinWindow ? 'Uma mensagem recente do contato é necessária para responder na janela de 24 horas.' : status.mode === 'simulated' ? 'Nenhuma chamada à Meta neste modo.' : status.reviewerReplyEnabled ? 'Responda somente às conversas desta conta, até 24 horas após a mensagem recebida. A liberação de avaliação expira automaticamente.' : 'Demonstração controlada: somente o contato autorizado, até 24 horas após sua última mensagem. Outros destinatários permanecem bloqueados.'}</p></form>
        </div>
      </section></>}
      {previewOpened && <div hidden={!instagramSections.find(item => item.id === section)?.preview}>
        <InstagramPrototypePreview section={previewSection} onNavigate={navigateSection} />
      </div>}
      </div>
      <p className="text-sm text-muted-foreground">As abas marcadas como Prévia recuperam o protótipo interativo. A integração real de automações, IA, menus e métricas ainda está em desenvolvimento. Este piloto não está habilitado no CRM principal.</p>
    </>}
    <Dialog open={!!deleteTarget} onOpenChange={open => { if (!open && !busy) setDeleteTarget(null) }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Excluir esta mensagem do CRM?</DialogTitle><DialogDescription>O conteúdo será removido desta base e não poderá ser recuperado pela conversa. A cópia no Instagram permanece. Cópias de segurança seguem o procedimento de exclusão de dados.</DialogDescription></DialogHeader>
        <DialogFooter><button className={button} disabled={busy} autoFocus onClick={() => setDeleteTarget(null)}>Manter mensagem</button><button className={button} disabled={busy} onClick={() => void confirmDelete()}>{busy ? 'Excluindo…' : 'Confirmar exclusão do CRM'}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
}
