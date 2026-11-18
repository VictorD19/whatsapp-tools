> Estado posterior: [gravações reais de 18/11 e requisitos restantes](PREPARATION-2026-11-18.md). Este roteiro registra a preparação de 17/11.

# Gravação real da análise Meta — 17/11/2026

Estado: roteiro pronto; gravação final ainda não produzida. Não enviar uma montagem
de fixtures, mensagens importadas ou histórico como evidência de webhook real.

## Critérios oficiais conferidos

A Meta pede o percurso completo de entrada no serviço, autorização dos recursos
Meta e uso dos dados de cada permissão solicitada. Se a interface estiver em
português, usar legendas em inglês. A documentação recomenda gravação legível,
idealmente em 1080p, com largura de até 1440, sem áudio e sem outras janelas.
Fonte: [Screen Recordings](https://developers.facebook.com/docs/app-review/submission-guide/screen-recordings/).

O avaliador precisa reproduzir o percurso e testar as permissões. O pacote não
deve ser submetido enquanto não permitir isso. Permissões não aprovadas ficam
limitadas aos usuários com função adequada; isso não é resolvido alterando o
CRM principal. Fonte: [App Review Introduction](https://developers.facebook.com/docs/resp-plat-initiatives/app-review/introduction).

## Sequência de captura

| Trecho | Tela real | Legenda em inglês |
| --- | --- | --- |
| Entrada | Login do serviço no endereço público do piloto | Sign in to the isolated ZapChat pilot. This is a service account, separate from Meta authorization. |
| Escopo | Instagram, suas abas e restrições explícitas | This review covers the Instagram connection and received Direct inbox. Preview sections are not submitted as working integrations. |
| Conexão | Conexão → Continuar com Facebook/Conectar Instagram | Connect one professional Instagram account using Meta business login. |
| Autorização | Seleção real de perfil/portfólio e permissões mínimas | Grant account identification and Instagram messaging access. No advertising account is required. |
| Perfil | Retorno OAuth e username confirmado pelo provedor | The authorized Instagram identity is stored for this business only. Tokens are encrypted before storage. |
| Dados | Conversas e mensagem efetivamente disponíveis pela integração | Received messages are associated with the authorized account and authenticated business. |
| Webhook | Evento real confirmado, se disponível | Show a provider-originated event and its persisted message without claiming history import is live webhook delivery. |
| Encerramento | Instruções de desconexão e página pública de exclusão | Disconnecting clears the stored connection token. Data deletion follows the published request procedure. |

Ocultar senhas, códigos OAuth, tokens e dados de clientes. Se houver senha/2FA,
interromper a captura e retomar após a autenticação, com indicação honesta do
intervalo. Não desconectar a conta atual nem enviar Directs para produzir uma cena
sem autorização específica. Não pedir novas mensagens de teste ao usuário.

## Preparação técnica desta data

O endpoint público passou novamente nas onze verificações e a assinatura Meta
continua ativa no servidor, com messages e standby. Isso não prova Direct real.
A sessão pessoal do Facebook foi recuperada. Instruções técnicas foram salvas
no rascunho 1690021079384646. A consulta do cadastro empresarial redirecionou
para uma solicitação de acesso pendente. Depois, razão social e país foram
localizados em documento empresarial compartilhado e preenchidos. O responsável
confirmou ausência de entrega por segurança nacional e procedimentos ainda não
formalizados; respostas salvas. Falta concluir os operadores e países.

Na branch, a interface restrita foi alinhada ao gateway: botão de importar histórico
ocultado, campo de resposta bloqueado quando o envio real está desligado e texto
coerente com essa etapa. Avisos transitórios de conexão agora desaparecem após
recuperação, sem limpar erros de outras ações. Build Web passou. Teste local de
queda/retomada da API confirmou o aviso e sua remoção automática sem recarregar.
Esses ajustes foram publicados somente no piloto como shared-20261117-r3.
Onze verificações externas e seis de isolamento passaram. Backup restaurado
antes e depois; os seis serviços principais não reiniciaram. Acesso SSH removido
às 15:23 UTC, com autenticação posterior recusada.

O token foi revalidado por leitura na Meta: aplicativo correto e permissões
instagram_basic, instagram_manage_messages e public_profile. A conta mantém
messages e standby. O endpoint de inscrição retornou os campos, sem ID do app;
a associação ao aplicativo foi conferida pelo debug do token, não inferida da
ausência desse ID no retorno.

Quatro mensagens antigas de teste foram localizadas no laboratório legado.
Somente “Teste ZapChat 15” foi consultada novamente na Graph API nesta preparação:
HTTP 200, conteúdo e remetente conferidos com o teste original. Uma cópia foi
preparada apenas no banco local de avaliação, com data original e origem history.
Não foi copiada para o servidor nem declarada como evento recebido pelo webhook.
A interface identifica explicitamente essa origem. Essa evidência demonstra
leitura de dados reais; não encerra a prova de recebimento em tempo real.

A captura experimental do navegador produziu somente um frame; não é um vídeo
da análise. Foi interrompida e não registrou o login da Meta. A autenticação
pessoal foi concluída; a gravação completa continua pendente. Não reutilizar o frame
único ou a prévia de 15/11 como se fossem a gravação final.

## Dependências restantes

1. Sessão pessoal do administrador para consultar o rascunho 1690021079384646 e
   o cadastro legal do portfólio Xtrategy. Não usar a sessão da Página como substituta.
2. Declarações do responsável preenchidas; concluir a lista dos operadores e
   seus países de processamento/acesso, com fonte aplicável ao serviço.
3. Manter a separação do avaliador na revisão R3 já publicada; concluir o fluxo
   reproduzível antes da entrega de credenciais à Meta.
4. Capturar a autorização real e o uso dos dados. Um painel sem mensagens ou um
   evento vazio assinado não conclui a prova de instagram_manage_messages.
5. Revisar o pacote completo e obter a confirmação necessária para concordâncias
   e submissão final. Nenhuma submissão foi executada nesta preparação.
