# Investigação do encaminhamento e contingência — 14/11/2026

## Conclusões verificadas

A ausência de app padrão não é, sozinha, uma explicação suficiente para a ausência
de eventos. A documentação oficial descreve zero-config behavior: sem esse
encaminhamento, vários apps conectados ainda recebem messages. Portanto, não
forçar uma mudança do padrão como se fosse um requisito universal de recebimento.

GET oficial de três conversas com fields=id,is_owner,updated_time retornou 200,
sem is_owner nos resultados. A referência documenta esse campo somente quando
Conversation Routing está habilitado; a ausência é compatível com esse estado,
mas não basta, sozinha, para provar sua configuração.

A tela da própria Página, acessada como Joaobosco.pro, confirmou explicitamente
que o app padrão não está configurado. A tentativa anterior não foi persistida
como app padrão nessa releitura. Nessa tela, o seletor oferece Inbox in Meta
Business Suite, Metricool, Marketing Master, Manychat e metricool-IG, mas não
ZapChat Social Lab. O Business Suite havia listado este último. Essa diferença
é uma pista de compatibilidade/elegibilidade entre as telas, não uma causa
comprovada. Nenhum outro app foi escolhido, removido ou reconfigurado.

A Página correta está ligada a @joaobosco.pro; Permitir acesso a mensagens do
Instagram na Caixa de Entrada já estava habilitado. Nada foi alterado nesse
controle. A documentação de encaminhamento exige Página com nova experiência,
mensagens habilitadas, app conectado com PAGES_MESSAGING e atuação como proprietário
da Página. Isso não autoriza adicionar permissões de Messenger por suposição ao
fluxo Unified Login, cujo requisito documentado para messages é
instagram_manage_messages.

## Entrega e limites

Uma mensagem naturalmente recebida às 10:28:27 Asia/Dubai (06:28:27 UTC) foi
confirmada por metadados da API, sem texto. Seu ID tem 167 caracteres; remetente
numérico diferente da própria conta e destinatário correto. Não houve POST real
correspondente no gateway. Consulta posterior apenas de metadados (11:27:50 Asia/Dubai) confirmou
**is_unsupported:true**, com zero anexos e zero tipos de compartilhamento
retornados. Isso explica sua não recuperação como texto elegível no piloto,
mas não a ausência de todos os webhooks. Não foi consultado o corpo para diagnóstico
nem demonstrado que o remetente tinha função no aplicativo.

A API retornou uso de 1% e estimated_time_to_regain_access=0. A consulta Cloudflare
MCP, limitada ao host do piloto entre 05:00 e 07:00 UTC, não retornou eventos de
firewall. Analytics adaptativa mostrou um POST no webhook, HTTP 200, compatível
com o envelope vazio sintético das 05:36:43 UTC já conhecido. Nenhum bloqueio de
POST real observado; não alterar WAF, DNS ou proteção do CRM por suposição.

Uma consulta de texto para diagnóstico foi recusada pela revisão automática.
Ela não foi executada nem contornada. A alternativa consultou apenas IDs,
direção e horários. Não inferir o conteúdo da mensagem natural a partir disso.

## Contingência temporária por API

Ferramenta: `tools/instagram-lab-reconcile.mjs`. Não é webhook e não oferece
recebimento instantâneo. Recupera somente textos elegíveis no escopo já existente:
até três conversas/vinte mensagens por conversa, após a conexão e nas últimas
24 horas. Não amplia o suporte a mídia/anexos nem garante recuperar toda a caixa.

- Endereço fixo 127.0.0.1:18001; sem destino configurável ou uso de produção.
- Exige usuário admin do tenant instagram-lab, sem superadmin; status de teste,
  modo Meta e envio real false.
- Exige a única conta ativa joaobosco.pro/17841400699000476. Sem reply, reconexão,
  criação de conta ou envio de mensagens.
- Intervalo mínimo cinco minutos; orçamento persistido de 12 tentativas por hora
  antes de qualquer consulta, mantido após reinícios. Até 48 leituras Meta/hora
  pela contingência, além de eventuais ações manuais/diagnósticas. O cooldown do
  servidor de 90 segundos continua valendo.
- Erro pausa por 30 minutos. Sem retry imediato ou exceções com texto/credenciais
  nos logs. Lock exclusivo impede duas instâncias locais deste processo.
- Credencial Meta permanece criptografada na API. A ferramenta lê somente a senha
  local já existente, guarda o token de sessão em memória e não o registra.
- Fechar a aba não encerra o processo. O computador ainda precisa ficar acordado
  e conectado; não é hospedagem permanente.

O processo separado executou ciclos às 11:10, 11:15, 11:20 e 11:25 Asia/Dubai
com a aba do piloto em about:blank. Reinício da versão testada preservou o
orçamento e esperou o próximo horário, sem chamada imediata. Os ciclos
terminaram sem erro e com processed:0. Isso significa
zero eventos textuais processados nessa rodada; não afirmar recuperação da
mensagem natural nem chegada de Direct real por webhook. Os 10 testes verificam
orçamento, pausa, reinício, identidade, conta, bloqueio de envio e rotas. Não usam
mensagens reais ou chamadas Meta. A suíte é chamada por instagram.lab-tools.spec.ts no job de testes já existente;
nenhuma alteração de workflow é necessária.

## Operação local

```sh
node tools/instagram-lab-reconcile.mjs status
node tools/instagram-lab-reconcile.mjs once
node tools/instagram-lab-reconcile.mjs run
node --test tools/instagram-lab-reconcile.test.mjs
```

Estado e log ficam em .instagram-test/reconcile-state.json e reconcile-worker.log,
fora do Git. Não remover um lock sem verificar se o processo identificado está
ativo. Para encerrar, enviar SIGTERM ao PID conferido do próprio reconciliador;
a saída normal remove o lock. Não executar init ou Compose de produção.

Chamado Meta existente: 2256928134873004. O perfil pessoal Joao Bosco foi restaurado após a inspeção da Página.
A investigação não foi substituída pela contingência. Recebimento real por webhook e causa da recusa ainda pendentes.
Nenhuma funcionalidade, banco, permissão ou publicação do CRM principal alterada.

## Fontes primárias

- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/conversation-routing
- https://developers.facebook.com/docs/graph-api/reference/conversation
- https://developers.facebook.com/documentation/instagram-platform/webhooks/fields
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions
- https://developers.cloudflare.com/analytics/graphql-api/tutorials/querying-firewall-events/
- https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/
