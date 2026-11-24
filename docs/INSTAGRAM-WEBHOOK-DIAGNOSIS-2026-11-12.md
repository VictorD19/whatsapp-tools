# Diagnóstico do webhook — 12/11/2026

## Evidências e limites

O Direct voluntário de teste 14 existe na Meta, criado às 12:30:41 UTC
(16:30:41 Asia/Dubai). Às 12:31:29 UTC, a conta Meta no banco local tinha zero
conversas e mensagens recebidas. Os testes 12 e 13 também não haviam chegado.
Não importar/injetar essas mensagens para declarar um webhook aprovado.

O registro anterior da API mostrava apenas chamadas concluídas com sucesso;
a ausência ali não prova, isoladamente, que não houve tentativa recusada.
Foi acrescentado diagnóstico temporário privado no gateway local: horário,
método, caminho sem query, assinatura presente/ausente, formato do envelope,
quantidades e status HTTP. Não registra texto, remetente, token, assinatura ou
query de verificação. Mantidas as restrições de rotas e tamanho do corpo.

Ao tentar abrir o teste pelo localizador semântico no painel Meta, a assinatura
messages foi desmarcada involuntariamente. A leitura da Graph API confirmou o
campo ausente. A mesma assinatura foi restabelecida pela API e relida às
12:37:49 UTC: instagram/messages v27.0, callback original daquele momento.
Ocorreu depois da falha do teste 14 e não explica os testes anteriores.
O teste seguinte foi aberto por índice de acessibilidade, sem mudar a assinatura.

## Correções no piloto

O evento sintético enviado pela própria Meta às 12:38:22 UTC chegou com
`entry[].changes[].field=messages` e valor em `changes[].value`; o receptor
aceitava apenas `entry[].messaging[]`. O corpo do exemplo usa timestamp em
segundos como string. Agora ambos os envelopes passam pelas mesmas validações
de conta, destinatário, remetente, tipo de mensagem e data. Campos diferentes
de messages, ecos, exclusões, dados malformados e datas futuras são ignorados.
Não foram relaxadas validação HMAC, autorização de empresa ou deduplicação.

O POST estava respondendo HTTP 201 pelo padrão do Nest. Foi definido HTTP 200
explicitamente, conforme a documentação de confirmação de webhooks da Meta.
Isso corrige o contrato de resposta; não prova a causa única da falta de Directs.

## Retomada após pausa

Durante a pausa, API/interface/gateway locais pararam. O túnel anterior passou
a registrar Unauthorized: Tunnel not found e deixou de resolver DNS.
PostgreSQL e Redis do laboratório permaneceram saudáveis, sem recriação de dados.
Os processos locais foram reativados, com logs privados e sem depender da sessão
interativa do terminal. Isso não mantém o piloto disponível com o computador
desligado, suspenso ou sem rede. O endereço temporário continua sujeito a troca.

Novo host: https://adoption-longer-headquarters-inspection.trycloudflare.com.
Callback registrado no painel; webhook atualizado pela Graph API e relido com
somente messages v27.0. Envio real permanece false; não houve ação em produção.

## Validação executada

- 44 testes do módulo Instagram passaram, incluindo novos envelopes, timestamps,
  destinatários incorretos, ecos e valores inválidos.
- API recompilou sem erros; API e interface locais responderam 200.
- Desafio HTTPS retornou o valor exato; evento sintético local assinado para conta
  inexistente recebeu HTTP 200 e não representa um Direct real.
- Evento da própria Meta às 16:10:59 UTC (20:10:59 Asia/Dubai) chegou ao novo host,
  com assinatura e envelope changes/messages, e recebeu HTTP 200. Conta fictícia
  intencionalmente ignorada, sem criação de conversas.

Solicitado novo Direct voluntário de teste 15 após essas correções. Recebimento
real ainda pendente neste registro. O aplicativo Meta continua separado e ativo;
não equivale a aprovação para clientes externos. O módulo não foi publicado no
CRM principal e nenhuma resposta real foi enviada.

Referência oficial consultada:
https://developers.facebook.com/documentation/instagram-platform/webhooks/setup
e exemplo fornecido pelo painel do próprio app para messages v27.0.
