# Liberação do recebimento real — 14/11/2026

## Preparação posterior com dados do CRM principal

Pacote consolidado em [instagram-meta-review/README.md](instagram-meta-review/README.md):
justificativas em inglês, instruções do avaliador, roteiro, matriz de evidências
GitHub e campos de dados pendentes. A leitura remota do MCP confirmou master em
755f310a206953d4436efb99da00c88b0672c0e5. Privacidade/termos fornecem contatos, mas
não razão social ou país. A consulta do cadastro Xtrategy na Meta exigiu 2FA;
nenhuma tentativa de contornar ou preencher fatos desconhecidos.

**Configurações básicas passaram de 50% para 100%:** a Meta aceitou o ícone PNG
transparente 1024x1024 baseado no favicon existente, categoria Negócio e Páginas
e política. Verificação empresarial também em 100%. A seleção de categoria da
etapa anterior só persistiu nesta conclusão. A tentativa JPEG foi recusada por
fundo branco e não foi tratada como salvamento bem-sucedido.

O guia Meta para apps de outras empresas também pede demonstração de mensagens
canceladas. A comparação com ChatbotX identificou deleteIncomingMessage, enquanto
o parser do piloto ignora is_deleted sem limpar texto já armazenado. Essa lacuna,
o acesso externo isolado e a demonstração final são pendências de desenvolvimento,
não motivos para pedir ao usuário que repita suas mensagens de teste. Não houve
alteração funcional de código nesta preparação nem envio do pedido.

As seções abaixo preservam o estado anterior à conclusão das configurações básicas.

## Causa informada pelo suporte

O chamado confidencial [2256928134873004](https://developers.facebook.com/support/bugs/2256928134873004/)
recebeu resposta de Katherine / Meta Support às **12:20 Asia/Dubai**.
Foi lida integralmente após recarregar o chamado. Status agora Closed.

Segundo o suporte, Standard Access / Ready for testing entrega messages e standby
somente em interações com usuários que tenham função no aplicativo. Mensagens
de remetentes sem função não disparam esses webhooks. A função do proprietário
da conta receptora, sozinha, não permite testar remetentes comuns. O suporte
considerou as assinaturas, verificação e assinatura criptográfica corretas e
não identificou falha de entrega. Também confirmou que Access all conversations
ON e messages/standby bastam para leitura passiva, sem novas mudanças de routing.

Isso substitui a hipótese de encaminhamento como caminho prioritário de correção.
Não remover outros apps, mudar dono de ativos, ampliar permissões de Página,
reduzir segurança ou repetir assinaturas sem evidência nova.

O suporte não considera mensagem para a própria conta uma prova confiável.
Sugeriu uma segunda conta com função Instagram Tester para uma demonstração
controlada. Nenhuma conta adicional foi convidada e nenhuma mensagem enviada.
O usuário não deve ser solicitado a repetir seus testes anteriores.

**Recebimento real ainda não comprovado.** A resposta explica a restrição;
não equivale à aprovação de acesso avançado nem a um evento real recebido.

## Rascunho criado na Meta

Aplicativo: ZapChat Social Lab, 1684815669905187.
Solicitação **1690021079384646**, não enviada:
https://developers.facebook.com/apps/1684815669905187/app-review/submissions/?submission_id=1690021079384646

- Somente instagram_basic e instagram_manage_messages.
- Desmarcados anúncios, publicação, comentários, insights, eventos e Human Agent.
- Xtrategy Digital Marketing aparece como portfólio verificado (etapa 100%).
- Política preenchida: https://sistemazapchat.com/privacy.
- Categoria selecionada: Negócio e Páginas.
- Etapa de configurações 50%; ícone obrigatório ainda ausente.
- Uso permitido exige justificativa, screencast e concordância de uso.
- Instruções para analista bloqueadas até adicionar uma plataforma ao app.
- Enviar para análise permanece desabilitado.

Não foram marcadas concordâncias nem enviadas declarações de tratamento de
dados. Nome legal/país do controlador, histórico de solicitações de autoridades
e práticas adotadas precisam de confirmação do responsável, solicitada no chat.
Não inferir esses fatos a partir do nome do portfólio ou do e-mail da política.

## Justificativas preparadas para revisão, ainda não salvas no formulário

### instagram_manage_messages

ZapChat Social Lab is an isolated CRM pilot. An administrator connects exactly
one Instagram professional account through Meta Unified Login, explicitly
authorizing the requested assets and permissions. The CRM uses this permission
to retrieve eligible Direct conversations and display incoming message text,
participant/message identifiers and timestamps in its Conversations interface.
It verifies webhook signatures and keeps data separated by tenant. Standby
conversations are read-only. Real outbound replies and AI replies remain disabled
in this pilot while reception is validated. Advanced Access is requested so
eligible messages from people without app roles can generate notifications,
as explained by Meta Support in case 2256928134873004. This submission concerns
the isolated pilot, not the existing production CRM. No working real-event
demonstration is claimed yet.

### instagram_basic

The pilot uses the connected professional account's identifier and username to
identify the account explicitly authorized through Unified Login, display its
connection status and associate eligible Direct conversations with the correct
tenant and account. The permission is a prerequisite for instagram_manage_messages.
The pilot does not request advertising, publishing, comments or insights permissions.

## Pendências reais antes de submeter

1. Ícone e plataforma Web correspondentes ao piloto, sem usar o CRM principal
   como se o Instagram já estivesse publicado nele.
2. Disponibilizar acesso externo autenticado para a análise, com conta de
   avaliador isolada e sem expor Directs de clientes ou credenciais pessoais.
   O túnel atual libera **apenas callback/webhook**, não o painel. Ampliar essa
   exposição requer autorização específica; não foi feito neste trabalho.
3. Gravar fluxo real controlado e completo. Não representar amostras sintéticas,
   histórico por API ou uma simulação de tela como webhook de usuário real.
   Uma segunda identidade de teste exige identificação e convite autorizado;
   não criar usuários falsos nem enviar mensagens não autorizadas.
4. Confirmar declarações de tratamento de dados e fornecedores. Cloudflare
   intermedeia HTTPS do piloto; mensagens ficam no banco local. Não declarar
   hospedagem DigitalOcean para este piloto só porque o CRM principal a utiliza.
5. Revisar material e concordâncias antes da submissão. Aprovação e prazo
   dependem da Meta; submissão não é liberação automática.

## Contingência e saúde

A busca de cinco minutos continua provisória e não contorna a exigência de
Advanced Access. Houve pausas por erro na etapa sync às 11:39 e 12:18 Dubai;
a ferramenta manteve o recuo de 30 minutos, sem repetição imediata. Uma leitura
diagnóstica de uma conversa, apenas IDs/horário, retornou HTTP200 em 4,6s às
12:28:49 Dubai. Não foi identificada a causa específica das duas falhas anteriores;
não atribuí-las a expiração, quota ou permissões sem código de erro correspondente.

Sem alterações de código ou implantação de produção nesta etapa. Envios do piloto
continuam desligados. Nenhuma nova mensagem de teste solicitada ou enviada.

## Referências

- Resposta privada do suporte no chamado acima (fonte da exigência sobre remetentes).
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started
- https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/eligibility-and-troubleshooting
- https://developers.facebook.com/documentation/business-messaging/instagram-messaging/webhooks/debugging

O depurador documentado fica em Messenger / Instagram Settings; essa seção não
está disponível na interface deste app Unified Login. Não adicionar o fluxo legado
ou permissões extras somente para tentar abrir esse depurador.
