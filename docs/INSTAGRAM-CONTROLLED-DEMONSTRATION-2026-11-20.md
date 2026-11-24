# Demonstração controlada — preparação em 20/11/2026

O piloto hospedado continua na R4, sem respostas reais habilitadas. Nenhuma
alteração no CRM principal ou no servidor foi feita nesta preparação.

## Remetente elegível

O usuário confirmou que @agenciainstapush é seu e foi o perfil usado para enviar
Teste ZapChat 15 a @joaobosco.pro. O usuário confirmou a ação de adicionar esse
perfil como Instagram Tester no app ZapChat Social Lab. O convite foi enviado
e a tabela da Meta mostrou Pendente. A sessão disponível do Instagram estava em
@joaobosco.pro; a troca de conta pediu autenticação. Login de @agenciainstapush
preenchido e entregue ao proprietário para senha/aceitação, sem senha gravada,
sem armazenar login e sem enviar Directs. Aceitação ainda não conferida.

A leitura do remetente pela Graph API retornou HTTP403/code4 (limite), não uma
negação permanente de permissão. Não houve repetição dessa consulta em loop.
A identidade do remetente não foi inferida de perfis de clientes.

O chamado 2256928134873004 foi relido: o suporte confirmou que as interações
sob Standard Access exigem papel no app também para o remetente. Não indicou
falha de entrega nem necessidade de mudar routing. O guia atual confirma Standard
Access para usuários com papel e Advanced Access para clientes sem papel:
https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions .

## Evidência independente na borda

Consulta Cloudflare via MCP, somente hostname instagram-review.sistemazapchat.com
+ caminho /api/v1/instagram/webhook, sem IPs, conteúdo ou dados do domínio principal:

- 18/11: duas respostas200 e uma403 às16h UTC.
- 19/11: nenhum grupo retornado.
- 20/11 até13:20UTC: duas200 e uma403 às12h; duas200 e uma403 às13h.

Os totais são compatíveis com as verificações registradas de desafio GET, POST
vazio assinado e POST inválido. Não atribuir cada chamada à Meta: os agregados
adaptativos não são logs brutos nem prova de todas as entregas. ASN não estava
disponível para essa zona. Não alterar regras/túnel a partir dessa limitação.
Fonte: https://developers.cloudflare.com/analytics/graphql-api/tutorials/end-customer-analytics/ .

## Proteção de resposta preparada na branch, não publicada

Uma futura demonstração não deve abrir envio a clientes. O módulo agora exige,
além do flag de envio e da allowlist do piloto, um escopo explícito válido:

```json
{"tenantId":"tenant-de-teste","instagramId":"123","participantId":"456"}
```

O JSON fica em INSTAGRAM_CONTROLLED_REPLY_SCOPE; os valores acima são fictícios.
Sem escopo, malformado, destinatário/conta diferentes, empresa diferente ou flag
desligado: envio bloqueado. A API verifica o alvo antes de criar a tentativa e
novamente imediatamente antes do transporte. O adaptador verifica conta e
recipiente independentemente. A segunda checagem usa a janela de24h atualizada,
sem reutilizar uma versão antiga da conversa. Não há envio automático de IA.

98 testes Instagram passaram, API compilou. Integrações PostgreSQL locais de
cancelamento/exclusão e standby passaram com rollback total, zero chamadas Meta.
A primeira execução dos testes encontrou problemas de tipagem da fixture e
interferência do ambiente do processo no teste de configuração; corrigidos antes
da execução final. Nada foi enviado durante os testes.

Essas proteções não habilitam o flag no servidor, não abrem a rota bloqueada do
gateway e não autorizam mensagens. A configuração atual da R4 permanece intacta.

## Próximos passos condicionados

1. Conferir aceitação do convite pelo perfil proprietário correto.
2. Preparar e obter autorização específica para qualquer envio automatizado
   controlado; não pedir ao usuário para repetir mensagens manualmente.
3. Para demonstrar resposta pelo CRM, preparar a liberação restrita no gateway e
   bootstrap do piloto, com backup/reversão e configuração explícita. O flag de
   envio genérico sozinho não basta e não deve ser ativado.
4. Gravar recepção real, resposta restrita, cancelamento e exclusão na versão
   efetivamente submetida. Mensagens antigas por Graph, amostras e replay local
   não são prova de recebimento em tempo real. Não afirmar análise pronta antes
   de concluir esse fluxo.
5. Conferir todos os anexos, fornecer somente o acesso separado do avaliador e
   obter as confirmações aplicáveis para concordâncias/submissão final.

O guia de gravação foi relido na sessão da Meta:
https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-other-businesses .
Os avaliadores usarão suas próprias contas Meta, sem exigir funções no app. Nunca
fornecer senhas pessoais do Facebook/Instagram para a análise.
