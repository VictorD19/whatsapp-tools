# Sincronização real do Instagram no piloto

## Resultado confirmado em 12/11/2026

Os Directs reais de teste, incluindo Teste ZapChat 15, foram obtidos pela API
oficial da Meta, armazenados no banco do piloto e exibidos em Conversas.
A tela mostra cinco mensagens recebidas na conversa de teste. O identificador
do teste 15 no banco coincide com o retornado pela Meta, com uma única cópia.
Evidência privada em `.instagram-test/native-receipt-proof-20261112.json`;
captura visível em `/Users/mac/Documents/Codex/2026-11-09/instagram-real-messages-visible-20261112.png`.

Este resultado comprova sincronização pela API, não entrega de um webhook real.
O webhook segue sem evento real confirmado; eventos sintéticos assinados passam
com HTTP 200. Não declarar que a causa da ausência de webhooks está resolvida.

## Funcionamento

- Rota autenticada de administrador `POST instagram/accounts/:id/sync`, com
  habilitação do piloto e isolamento por empresa. Usa apenas o token cifrado
  da conta ativa autorizada e operações GET na Meta; não envia Directs.
- No máximo três conversas recentes e vinte mensagens por conversa por rodada.
  Apenas texto recebido pelo Instagram autorizado, após sua conexão e dentro
  das últimas 24 horas; sem importação completa de histórico.
- Valida origem/destinatário e reutiliza a persistência dos webhooks, incluindo
  unicidade por conta/identificador da Meta e controle de exclusão/reentrega.
- Intervalo compartilhado de 90 segundos em Redis impede multiplicar consultas
  por cliques repetidos/abas concorrentes. No máximo quatro leituras Meta por
  rodada. Falhas também respeitam o intervalo; isso não garante capacidade ou
  cota para uma implantação geral com vários clientes.
- Descarta resultados de uma conexão que tenha sido revogada/alterada durante
  a leitura. A interface preserva a conversa e o rascunho selecionados; respostas
  atrasadas de outra conta não substituem a conta atual.
- Ao abrir Instagram, mostra primeiro as conversas já armazenadas e sincroniza
  em seguida. Atualizar consulta a Meta e recarrega Conversas. Atualização
  automática a cada 90 segundos enquanto a aba está visível/aberta.

## Validação

48 testes do módulo passaram: leituras limitadas, mensagem endereçada à conta,
exclusão de saídas/anexos/histórico anterior, cooldown, isolamento e revogação
durante sincronização, além das proteções anteriores. API recompilou sem erros.
Validação real: API oficial → persistência → endpoint de conversas → tela,
com o teste 15 visível e resposta real desabilitada.

Não foi solicitado outro envio de teste para obter esse resultado. Foram usadas
as mensagens que o usuário já enviou. Nenhuma mensagem foi fabricada ou injetada
como se tivesse vindo de webhook. Nenhuma resposta real foi enviada.

## Limites antes de produção

Módulo permanece no laboratório e bloqueado em NODE_ENV=production. O envio
real continua false. O CRM principal não foi alterado; PR 118 segue em rascunho.
O laboratório depende deste computador e de sua conexão; a sincronização por
aba não é um worker permanente. Antes de atender clientes, concluir estratégia
de entrega contínua, limites da Meta, hospedagem, revisão/permissões e retorno.
