# Webhook com endereço fixo — 13/11/2026

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
