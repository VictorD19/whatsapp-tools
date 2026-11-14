# Diagnóstico enviado ao suporte Meta — 14/11/2026

## Encaminhamento autorizado, mas recusado pela Meta — 14/11/2026

Após o usuário restaurar a sessão Facebook do Chrome Joao, foi possível abrir
Configurar no encaminhamento de @joaobosco.pro. A Meta exigiu selecionar um app
padrão e avisou que o encaminhamento poderia ser incompatível com a configuração
atual. ZapChat Social Lab apareceu na lista. A seleção foi preparada sem salvar,
e o usuário autorizou explicitamente aplicar a mudança, ciente do possível
impacto nos outros aplicativos de sua conta.

A tentativa de confirmação terminou no aviso **“Falha ao configurar
encaminhamento de conversas.”** Não houve confirmação de persistência do app
padrão. Não afirmar que a configuração antiga foi preservada nem que o novo
padrão foi aplicado sem uma releitura conclusiva. Após recarregar, a verificação
foi interrompida por mudança de janela no Chrome. Não repetir mutações às cegas.

O chamado confidencial 2256928134873004 continuava Open, sem resposta da Meta.
Um único complemento técnico com a falha exata foi enviado e confirmado como
comentário de Joao Bosco às **10:44 Asia/Dubai**. Sem credenciais, anexos ou
conteúdo de clientes. A falha da tela não foi demonstrada como causa única da
não entrega de Directs; o suporte foi solicitado a investigar elegibilidade,
permissões e incompatibilidade de encaminhamento.

Checagem de leitura às 10:29 Asia/Dubai: BISU válido para o app correto,
instagram_basic/instagram_manage_messages/public_profile; assinatura da conta
messages/standby; endpoint público sem token retorna 403. Nenhum novo POST real
no diário do gateway. Nenhum Direct adicional enviado, nenhuma resposta de
cliente habilitada, nenhum outro app removido, nenhum request_thread_control
executado e nenhuma modificação no CRM principal.

Atendimento criado em 14/11/2026 às 10:09 Asia/Dubai, após autorização específica
do usuário para o envio e aceitação dos Meta AI Terms. O formulário foi marcado
como confidencial antes de enviar. A página final confirmou o título, o app
ZapChat Social Lab e status Open.

Protocolo: **2256928134873004**.
URL: https://developers.facebook.com/support/bugs/2256928134873004/
Categoria exibida no atendimento: Platform Technical Integrations.
Empresa: Xtrategy Digital Marketing. Sem anexos, tokens ou mensagens de clientes.
Nenhuma resposta do suporte foi observada nesta confirmação. Não criar relato
duplicado; continuar neste protocolo quando houver retorno.

O texto abaixo é o diagnóstico preparado; seu conteúdo foi enviado em inglês
nos campos de reprodução e informações adicionais. O nome do arquivo conserva
DRAFT para preservar os links existentes.

Data: 14/11/2026. Objetivo: identificar por que as notificações reais de Direct
não são observadas no callback, embora amostras assinadas do painel cheguem.
Este documento não comprova defeito da Meta; pede diagnóstico de elegibilidade,
entrega e configuração. Nenhum token, segredo, texto de cliente ou log privado
está incluído.

## Integração

- Aplicativo: ZapChat Social Lab, ID 1684815669905187, publicado.
- Configuração Unified Login: 1680712757031270.
- Instagram profissional do piloto: @joaobosco.pro, ID 17841400699000476.
- Host: graph.facebook.com, versão v27.0, token BISU do cliente.
- Escopos presentes: instagram_basic, instagram_manage_messages, public_profile.
- Callback: https://instagram-lab.sistemazapchat.com/api/v1/instagram/webhook.
- Objeto instagram ativo, fields messages e standby; inscrição da conta relida
  com os mesmos campos. Include Values habilitado na configuração.
- Joao Bosco administrador; joaobosco.pro testador. Permissão de mensagens no
  painel aparece Pronto para teste; não há Advanced Access aprovado.

## Evidências

- Verificação GET válida devolve o challenge exato e HTTP 200. Inválida: 403.
- Amostras do próprio painel Meta chegaram assinadas: messages em 13/11 às
  15:44:15 UTC e standby às 16:12:59 UTC. Ambos HTTP 200, com a tela do piloto
  fechada. Envelopes fictícios não foram gravados como Directs reais.
- A API oficial lê conversas reais dessa conta; seu acesso não está vazio.
- Em 13/11 às 16:30:25–16:30:30 UTC, a inscrição deste app na conta foi removida
  e recriada, com success:true e releitura confirmada. Outros apps preservados.
- Uma única mensagem foi enviada pelo próprio Instagram da conta para si mesma
  em 14/11 por volta de 05:37 UTC; a API confirmou sua existência. Não foi
  observado POST real correspondente. Solicitamos esclarecer se esse autoteste
  deve produzir messages/standby no Unified Login; não o tratamos como prova
  suficiente de falha de entrega de uma mensagem recebida de terceiro.
- Registro de chegada no gateway não contém entrada assinada com o ID da conta
  real até a verificação desta rodada. Nenhuma falha HMAC real foi observada.

## Encaminhamento e limites

Há outros apps conectados. No Business Suite, Acesse todas as conversas estava
ligado para ZapChat Social Lab, e Assuma o controle desligado. Não foram alterados
app padrão ou configurações dos demais. O piloto trata standby como somente
leitura e não tomou controle de conversas. Respostas reais permanecem desligadas.

O túnel encaminha somente callback e webhook a um receptor local separado da
interface. O computador precisa ficar ligado. As amostras comprovam a rota nos
horários registrados, não disponibilidade histórica contínua.

Um campo experimental messaging_handover foi aceito no app e recusado na conta
(código 100, campo não suportado); nenhum request_thread_control foi enviado.
O campo foi removido explicitamente do app em 14/11. Esse erro esperado não é
apresentado como falha de entrega.

## Questões para investigação

1. O app/conta/BISU tem elegibilidade efetiva para messages e standby em Standard
   Access nesse piloto com administrador/testador? Há restrição adicional na
   identidade de quem envia o Direct ou na associação entre os portfólios?
2. O autoteste de conta para si mesma gera evento neste fluxo? Se não, qual
   diagnóstico oficial evita solicitar novos envios manuais ao usuário?
3. Existe erro de entrega, associação ou elegibilidade no lado Meta que explique
   amostras entregues e ausência de eventos reais observados?
4. Há configuração de encaminhamento obrigatória além de Acesse todas as
   conversas para receber standby sem assumir controle dos outros aplicativos?

Não solicitar que o usuário compartilhe tokens ou senhas. O envio ao suporte foi
autorizado e concluído no protocolo acima. Novos destinatários exigem escopo próprio.

## Referências oficiais consultadas

- https://developers.facebook.com/documentation/instagram-platform/webhooks/setup
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions
