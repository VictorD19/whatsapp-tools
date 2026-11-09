'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { apiGet, apiPost, apiDelete } from '@/lib/api'

type Account = { id: string; username: string; mode: string; active: boolean; tokenExpiresAt: string | null }
type Conversation = { id: string; participantId: string; lastInboundAt: string | null }
type Message = { id: string; direction: string; text: string; status: string; sentAt: string }
type Status = { enabled: boolean; mode: 'simulated' | 'meta'; testOnly: boolean; realSendingEnabled: boolean }
const panel = 'rounded-xl border bg-card p-5 space-y-4'
const button = 'rounded-md border px-4 py-2 text-sm disabled:opacity-40'
const field = 'w-full rounded-md border bg-background px-3 py-2 text-sm'

export default function InstagramPage() {
  const [status, setStatus] = useState<Status | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [accountId, setAccountId] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [conversationId, setConversationId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [incoming, setIncoming] = useState('Olá! Gostaria de saber mais.')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const selected = useRef('')
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
  const loadConversations = useCallback(async (id: string) => {
    const result = await apiGet<{ data: Conversation[] }>(`instagram/accounts/${encodeURIComponent(id)}/conversations`)
    return result.data
  }, [])
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
    let cancelled = false
    setConversations([]); setConversationId(''); setMessages([]); selected.current = ''
    if (accountId) loadConversations(accountId).then(data => {
      if (!cancelled) { setConversations(data); setConversationId(data[0]?.id || '') }
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar as conversas.') })
    return () => { cancelled = true }
  }, [accountId, loadConversations])
  useEffect(() => {
    let cancelled = false
    selected.current = conversationId
    setMessages([]); setText(''); attempt.current = null; setHasMore(false)
    if (conversationId) apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(conversationId)}/messages`).then(result => {
      if (!cancelled) { setMessages([...result.data].reverse()); setHasMore(result.data.length === 50) }
    }).catch(() => { if (!cancelled) setError('Não foi possível carregar as mensagens.') })
    return () => { cancelled = true }
  }, [conversationId])

  async function action(work: () => Promise<void>) {
    setBusy(true); setError(''); setNotice('')
    try { await work() } catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível concluir. Tente atualizar a tela.') }
    finally { setBusy(false) }
  }
  async function refreshMessages(id: string) {
    const result = await apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(id)}/messages`)
    if (selected.current === id) { setMessages([...result.data].reverse()); setHasMore(result.data.length === 50) }
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
    <header><p className="text-sm text-muted-foreground">AMBIENTE DE TESTES</p><h1 className="text-2xl font-semibold">Instagram</h1><p className="mt-2 text-muted-foreground">Primeira etapa: receber mensagens do Direct e responder manualmente. Seus atendimentos WhatsApp ficam separados.</p></header>
    {error && <div className="rounded-lg border border-red-300 p-4" role="alert">{error}</div>}
    {notice && <div className="rounded-lg border p-4" role="status">{notice}</div>}
    {status?.enabled && <>
      <section className={panel}>
        <h2 className="font-semibold">Conexão {status.mode === 'simulated' ? 'simulada' : 'com a Meta'}</h2>
        <p className="text-sm text-muted-foreground">{status.mode === 'simulated' ? 'Use uma conta fictícia para testar o percurso sem acessar o Instagram.' : 'Conecte uma conta profissional autorizada no aplicativo Meta de testes. O envio real precisa ser habilitado separadamente.'}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button className={button} disabled={busy} onClick={() => action(async () => {
            if (status.mode === 'simulated') { await apiPost('instagram/simulated-account', {}); await loadAccounts() }
            else { const result = await apiGet<{ data: { url: string } }>('instagram/connect'); window.location.assign(result.data.url) }
          })}>{status.mode === 'simulated' ? 'Criar conta de teste' : 'Conectar Instagram'}</button>
          <label className="text-sm">Conta<select className={field} value={accountId} disabled={busy} onChange={e => setAccountId(e.target.value)}><option value="">Escolha uma conta</option>{accounts.filter(a => a.active).map(a => <option key={a.id} value={a.id}>@{a.username} · {a.mode === 'simulated' ? 'simulação' : 'Meta'}</option>)}</select></label>
          {account && <button className={button} disabled={busy} onClick={() => action(async () => { await apiDelete(`instagram/accounts/${encodeURIComponent(account.id)}`); await loadAccounts() })}>Desconectar neste ambiente</button>}
        </div>
      </section>
      {status.mode === 'simulated' && account && <section className={panel}><h2 className="font-semibold">Simular mensagem recebida</h2><form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); action(async () => {
        await apiPost('instagram/simulate-inbound', { accountId, participantId: '123456789', text: incoming })
        const data = await loadConversations(accountId); setConversations(data); const id = data[0]?.id || ''; setConversationId(id); if (selected.current === id) await refreshMessages(id)
      }) }}><label className="grow text-sm">Mensagem do contato<input className={field} value={incoming} onChange={e => setIncoming(e.target.value)} maxLength={1000} required /></label><button className={button} disabled={busy}>Receber mensagem fictícia</button></form></section>}
      <section className="grid gap-4 md:grid-cols-[260px_minmax(0,1fr)]">
        <aside className={panel}><h2 className="font-semibold">Conversas</h2><button className={button} disabled={!accountId || busy} onClick={() => action(async () => { const data = await loadConversations(accountId); setConversations(data); if (conversationId) await refreshMessages(conversationId) })}>Atualizar</button><p className="text-xs text-muted-foreground">Até 50 conversas recentes neste piloto.</p>{!conversations.length && <p className="text-sm">Nenhuma mensagem recebida.</p>}{conversations.map(c => <button className={`${button} block w-full text-left ${conversationId === c.id ? 'bg-muted' : ''}`} key={c.id} onClick={() => setConversationId(c.id)}>Contato {c.participantId}<span className="block text-xs text-muted-foreground">Direct do Instagram</span></button>)}</aside>
        <div className={panel}><h2 className="font-semibold">{conversation ? `Contato ${conversation.participantId}` : 'Selecione uma conversa'}</h2>
          {hasMore && <button className={button} disabled={busy} onClick={() => action(async () => { const id = conversationId; const result = await apiGet<{ data: Message[] }>(`instagram/conversations/${encodeURIComponent(id)}/messages?before=${encodeURIComponent(messages[0].id)}`); if (selected.current === id) { setMessages(previous => [...result.data].reverse().concat(previous)); setHasMore(result.data.length === 50) } })}>Mensagens anteriores</button>}
          <div className="max-h-96 min-h-40 space-y-3 overflow-y-auto" aria-live="polite">{messages.map(m => <div key={m.id} className={`max-w-[90%] whitespace-pre-wrap rounded-lg p-3 text-sm ${m.direction === 'out' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted'}`}>{m.text}<span className="mt-2 block text-xs opacity-75">{m.direction === 'in' ? 'Contato' : 'Atendente'} · {new Date(m.sentAt).toLocaleString('pt-BR')} · {m.status === 'received' ? 'Recebida' : m.status === 'sent' ? 'Enviada' : 'Sem confirmação final'}</span></div>)}</div>
          <form className="space-y-3" onSubmit={send}><label className="block text-sm">Sua resposta<textarea className={field} value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={1000} required disabled={!conversation || busy || uncertain} /></label><button className={button} disabled={!conversation || busy || uncertain || !withinWindow || (status.mode === 'meta' && !status.realSendingEnabled)}>{busy ? 'Processando…' : status.mode === 'simulated' ? 'Responder na simulação' : 'Enviar resposta'}</button><p className="text-xs text-muted-foreground">{uncertain ? 'Existe um envio pendente ou incerto. Verifique antes de enviar novamente.' : !withinWindow ? 'Uma mensagem recente do contato é necessária para responder na janela de 24 horas.' : status.mode === 'simulated' ? 'Nenhuma chamada à Meta neste modo.' : 'Envios respeitam a janela de 24 horas desde a última mensagem recebida.'}</p></form>
        </div>
      </section>
      <p className="text-sm text-muted-foreground">IA, comentários, automações e importação do histórico serão adicionados depois de validar este percurso. Este piloto não está habilitado em produção.</p>
    </>}
  </div>
}
