# Evidências consultadas

## CRM principal: leitura remota pelo MCP GitHub

Em 14/11/2026 a branch master de VictorD19/whatsapp-tools retornou
**755f310a206953d4436efb99da00c88b0672c0e5**, a mesma base da cópia de testes.
Foram consultadas a árvore completa, páginas legais e os arquivos abaixo.
Nenhuma alteração foi feita em master. As páginas legais publicadas em 11/11
são posteriores ao texto antigo de master; consultar também PRIVACY-PAGES-RELEASE.md.

| Fonte fixada | O que demonstra |
| --- | --- |
| [Privacidade](https://github.com/VictorD19/whatsapp-tools/blob/755f310a206953d4436efb99da00c88b0672c0e5/apps/web/src/app/%28auth%29/privacy/page.tsx) | Contato de privacidade, e-mail do responsável, finalidades e retenção declaradas |
| [Termos](https://github.com/VictorD19/whatsapp-tools/blob/755f310a206953d4436efb99da00c88b0672c0e5/apps/web/src/app/%28auth%29/terms/page.tsx) | Produto SaaS, contas próprias, atendimento/CRM e legislação brasileira declarada |
| [Criptografia](https://github.com/VictorD19/whatsapp-tools/blob/755f310a206953d4436efb99da00c88b0672c0e5/apps/api/src/shared/crypto/aes-crypto.service.ts) | Implementação AES-256-GCM para valores enviados ao serviço; IV aleatório e tag autenticada |
| [Tenant guard](https://github.com/VictorD19/whatsapp-tools/blob/755f310a206953d4436efb99da00c88b0672c0e5/apps/api/src/core/guards/tenant.guard.ts) | Contexto de empresa derivado do usuário autenticado; não é uma auditoria completa de todas as consultas |

As páginas não informam razão social, CNPJ, nome civil completo ou país de sede.
Aplicar legislação brasileira nos termos não comprova localização do controlador.
O e-mail do desenvolvedor Victor não comprova quem decide as finalidades dos dados
do novo app. A árvore não contém documentação identificável sobre pedidos de
segurança nacional ou processo de tratamento desses pedidos.

A busca dirigida nas notas do hub Xtrategy não trouxe esses fatos. No cadastro
Meta, Ver detalhes e a abertura direta do portfólio proprietário chegaram a uma
exigência de 2FA. Não foi contornada. O status Verificado do portfólio permanece
confirmado na análise do app, mas não revela sozinho nome legal/país.

## ChatbotX: referência técnica, sem reutilização de credenciais ou aprovação

Revisão observada na busca GitHub: **6d87fac6926b0ffc292368462b55e3ab62fdb9c6**.

- [Autenticação](https://github.com/ChatbotXIO/ChatbotX/blob/6d87fac6926b0ffc292368462b55e3ab62fdb9c6/integrations/instagram/src/apis/auth.ts):
  usa Instagram OAuth e troca para token de longa duração do fluxo Instagram Login.
  O app novo do piloto usa Unified Login/BISU; não transplantar essa troca de token.
- [Webhook](https://github.com/ChatbotXIO/ChatbotX/blob/6d87fac6926b0ffc292368462b55e3ab62fdb9c6/integrations/instagram/src/handlers/webhook.ts):
  valida HMAC, percorre mensagens em lote e encaminha is_deleted para
  deleteIncomingMessage. É referência para o requisito de mensagens canceladas.
- O código público não concede Advanced Access a outro app, nem demonstra quais
  permissões/níveis estão aprovados no app hospedado do ChatbotX.

Nenhum código desses arquivos foi copiado para o piloto nesta preparação.

## Diretrizes Meta verificadas no navegador

[Apps para outras empresas](https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-other-businesses)
solicita Website acessível, instruções, conta própria do serviço para o avaliador
e gravação mostrando configuração e teste. Para caixa de entrada personalizada,
inclui envio, resposta/exclusão e tratamento de mensagens com envio cancelado.
Os avaliadores usam suas próprias contas Meta; não fornecer senha pessoal do
Instagram/Facebook nem criar usuários fictícios do Facebook para esse propósito.

Essa página contém dependências do fluxo legado. A lista de permissões do piloto
continua seguindo a documentação específica de Unified Login; não adicionar
business_management/pages_* apenas por aparecerem no guia legado.

Fonte específica: [Permissões Unified Login](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/permissions).
