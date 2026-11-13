# Webhook com endereço fixo — 13/11/2026

## Verificação posterior e reinscrição

O commit de implementação 866593a passou em Tests e Docker Build no GitHub
(run 43461148949). Uma observação local de 290 segundos terminou às 20:22:47
Asia/Dubai sem entrega assinada para a conta e sem conversa marcada como recebida
por webhook. Isso não mede toda a atividade da conta na Meta.

O painel confirmou joaobosco.pro (17841400699000476) com assinatura do webhook
“Ativado”. O depurador específico por Página da configuração antiga não está
disponível no fluxo unificado exibido. O campo messaging_handover foi aceito no
nível do app, mas recusado pela inscrição da conta com erro 100 de parâmetro não
suportado (trace AeoWU7TdEBypnE4WV5TfiAQ). A tentativa parou antes de solicitar
controle de qualquer conversa. O campo temporário foi removido: somente messages
e standby permaneceram. Não usar esse erro esperado como prova de falha da Meta.

Às 20:30:25–20:30:30, somente a inscrição do próprio app foi removida e recriada
para eliminar possível associação antiga. DELETE e POST retornaram success:true;
GET posterior confirmou messages e standby. Token, conexão local e inscrições
dos outros apps preservados. Não houve envio de Direct nem alteração de controle.

Foi preparado no Instagram um autoteste de @joaobosco.pro para si mesmo, sem
destinatário externo. A revisão automática recusou o clique em Enviar por exigir
autorização específica para uma nova mensagem real. O texto permaneceu como
rascunho e foi solicitada autorização ao usuário. Não declarar esse teste enviado
ou concluído antes de confirmação. Uma leitura ampla da caixa de entrada também
foi recusada; a inspeção foi restrita ao cabeçalho e ao campo do próprio rascunho.

## Atualização posterior: acesso liberado e canal de espera

O usuário entrou pelo Facebook no Chrome. Foi possível abrir Encaminhamento da
conversa no portfólio Joao Bosco, selecionar @joaobosco.pro e consultar cinco apps:
Metricool, Marketing Master, Manychat, ZapChat Social Lab e metricool-IG.
Em Gerenciar ZapChat Social Lab, “Acesse todas as conversas” já estava ligado e
“Assuma o controle das conversas” desligado. Nenhum desses controles foi alterado.
O bloqueio da sessão Instagram descrito abaixo não impede mais essa inspeção.

A integração só assinava/tratava messages. Foi acrescentado standby no app e na
conta, com confirmação e releitura pela API às 20:06:34 Asia/Dubai. Novas conexões
também assinam ambos. O parser aceita entry.standby e changes/standby com as
mesmas validações de HMAC, destinatário, remetente, eco e data. Não assumir que
essa lacuna era a única causa da ausência de eventos reais.

Mensagens passivas são gravadas, mas não autorizam resposta: a conversa preserva
o canal e a data do último evento de webhook. API de histórico não pode limpar
esse estado; eventos antigos não tomam precedência; empates privilegiam leitura
passiva. Resposta é bloqueada na interface e no servidor, inclusive se o canal
mudar antes do envio. Não foi escolhido outro app padrão, tomado controle de
conversa nem modificada uma configuração de Manychat ou dos outros aplicativos.

Migration 20261113160500_instagram_standby aplicada somente a instagram_lab em
127.0.0.1:15432: dois campos na tabela InstagramConversation. Nenhuma tabela do
WhatsApp ou banco de produção alterado. 52 testes do módulo passaram; teste com
PostgreSQL local e serviço compilado validou bloqueio de resposta, ordem dos
eventos, empate conservador, deduplicação e rollback integral dos dados fictícios.
Ferramenta reproduzível: tools/instagram-standby.integration.mjs; sem chamadas Meta.

Às 20:12:59, a amostra assinada de standby enviada pela própria Meta recebeu
HTTP 200 com a aba de Conversas em about:blank. Seu valor é vazio e foi ignorado;
isso não prova persistência de um Direct real, validada apenas com dados locais
fictícios nessa rodada. **Ainda não há Direct real confirmado pelo webhook.**

Uma leitura posterior da atividade Meta retornou HTTP 403/código 4 (limite de
chamadas). A consulta não concluiu; não inferir que não houve atividade. Foram
retiradas as consultas automáticas à Meta na abertura e a cada 90 segundos.
A tela agora atualiza somente o banco local a cada três segundos enquanto visível;
Sincronizar com Instagram é uma ação manual e limitada pelo cooldown existente.
O receptor permanece independente da aba. Não há worker de polling disfarçado
de webhook, e mensagens não foram fabricadas no perfil real.

Checagem TypeScript global da interface retornou erros em e2e/plans.spec.ts,
next.config.ts, telas administrativas e componentes fora desta alteração; não
apontou erro no arquivo Instagram. Não declarar type-check global aprovado.
Interface local recompilou; checks remotos da nova revisão devem ser conferidos.

## Correção aplicada no piloto

O túnel temporário continuava ligado, mas recusava reconexões com
`Unauthorized: Tunnel not found`. API, gateway e banco locais estavam ligados.
Isso comprova a indisponibilidade posterior do endereço; não explica a ausência
de Directs enquanto o túnel anterior funcionava.

Novo host: `https://instagram-lab.sistemazapchat.com`. Túnel nomeado
`zapchat-instagram-pilot`, ID `f3ccf046-8d29-4be7-bf89-738c982ba225`.
Somente `/api/v1/instagram/callback` e `/api/v1/instagram/webhook` são encaminhados
a 127.0.0.1:18002. Outras rotas retornam 404. Foi adicionado um CNAME novo;
registros principais, serviços e banco do CRM em produção não foram alterados.

Webhook atualizado e relido no app ZapChat Social Lab (1684815669905187), objeto
instagram, apenas messages v27.0, com valores. Inscrição da conta autorizada
reafirmada com token existente e success:true. Nenhuma permissão foi ampliada.
Callback fixo salvo na configuração OAuth 1680712757031270; configuração privada
anterior preservada e somente a API local reiniciada. Envio continua false.

## Evidências

- Às 19:44:15 Asia/Dubai, a amostra assinada da própria Meta chegou ao novo host
  com HTTP 200, enquanto a aba de Conversas estava em about:blank. Conta fictícia
  corretamente ignorada; não foi criado um Direct real.
- Às 19:55, dois envelopes vazios sintéticos assinados receberam 200. Sem
  assinatura: 403. Rota administrativa: 404. Nenhum dado pessoal nesses checks.
- Checks remotos de 12c7164: Tests e Docker Build passaram; 48 testes locais do
  módulo já haviam passado nessa versão do código.
- Reentrega de mensagem real não executada: a revisão automática recusou a
  retransmissão de texto/identificador reais pela Cloudflare. Envelope vazio foi
  a alternativa. Não declarar replay real ou nova persistência real nesta rodada.

## Pendência e acesso necessário

**Ainda não há Direct real confirmado no webhook.** O sucesso de 12/11 foi pela
sincronização da API oficial. A amostra prova transporte/HMAC, não eventos reais.

O Business Suite abre a caixa de entrada e mostra a Página 130449150147593. Ao
abrir Business settings, a Meta retorna `blocked_ig_user_in_mbs` e “You don't have
access to Settings”. A sessão atual entrou pelo Instagram; foi solicitada a
entrada pelo Facebook com controle total do portfólio Joao Bosco (944280930193062)
para conferir o encaminhamento. **Não foi demonstrado que ele seja a causa.**
Consultas de roteamento pela Página também foram recusadas por falta de permissão
pages_read_engagement. Essa permissão não foi adicionada. Não alterar app padrão,
propriedade de ativo ou permissões de outros apps por suposição.

Não pedir outra mensagem de teste. A Meta não fornece consulta a notificações
históricas de webhook; usar diagnóstico oficial e eventos naturais, distinguindo
recebimento pelo webhook de sincronização pela API.

## Operação

API e túnel são processos separados da interface. Fechar a aba não os encerra.
O endereço nomeado sobrevive a reconexões, mas o laboratório ainda depende deste
computador ligado, acordado e conectado. Não é hospedagem permanente 24h.

Token privado: `.instagram-test/named-tunnel.token`, modo 600, fora de Git e
Obsidian. Verificar se o conector já está ligado antes de retomar:

```sh
.instagram-test/cloudflared tunnel --no-autoupdate run \
  --token-file "$PWD/.instagram-test/named-tunnel.token"
```

API: `tools/instagram-lab.mjs api-meta`; gateway: `tools/instagram-webhook-gateway.mjs`.
Não executar init, recriar volumes ou carregar configuração de produção.
Registros privados em `.instagram-test/`: fixed-webhook-config-20261113.json,
fixed-webhook-verification-20261113.json, named-tunnel-20261113.json e
gateway-diagnostics-20261112.jsonl.

Referências oficiais consultadas:
https://developers.facebook.com/documentation/instagram-platform/webhooks/setup
e https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/conversation-routing
