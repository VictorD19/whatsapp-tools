Estado posterior de 23/11: **Direct real recebido pelo webhook e resposta confirmada nas duas pontas. Envios temporários desligados.** Provedor de Tecnologia aplicado e novo vídeo real preparado. R8 do avaliador compilada e testada, ainda não publicada; concordâncias e ativação aguardam confirmação. Upload novo não confirmado. [Evidências e pendências atuais](../INSTAGRAM-REAL-DIRECTS-2026-11-23.md). Registros anteriores abaixo são históricos.

Atualização posterior de 23/11: **Instagram e Página reconectados**, novo token válido com pages_show_list e uma única Página atribuída, inscrições de mensagens/callback conferidos. A Meta exige cadastro como Provedor de Tecnologia para adicionar pages_show_list à análise; confirmação específica pendente. Demonstração real nova aguarda autorização, sem solicitar Direct manual. [Reconexão, justificativa e exigência da Meta](PAGE-PERMISSION-2026-11-23.md).

Atualização de 23/11: **R7 publicada somente no piloto**, backups anterior e posterior restaurados, seis serviços principais preservados, 11 verificações HTTPS aprovadas. Reconexão com Instagram e Página na revisão final da Meta, aguardando confirmação da nova concessão. **Recebimento real ainda não comprovado; análise não submetida.** [Publicação e pendências atuais](../INSTAGRAM-PILOT-R7-PUBLISHED-2026-11-23.md).

Estado vigente em23/11: a Meta orientou incluir a Página vinculada na conexão.
Nova configuração Pages+Instagram criada após autorização; código/pacote R7
preparados e testados, ainda não publicados. A R6 permanece no piloto, com envios
bloqueados. [Correção indicada pela Meta e próximos passos](../INSTAGRAM-META-PAGE-WORKAROUND-2026-11-23.md).
Registros anteriores abaixo são históricos.

Atualização de 21/11: instruções do avaliador e roteiro consolidados; proteção de
resposta controlada do host/gateway preparada na branch, ainda não publicada.
Convite do remetente continua pendente; recebimento real e vídeo completo não
comprovados. **Análise ainda não pronta para envio.**
[Estado vigente](PREPARATION-2026-11-21.md). Registros anteriores abaixo são históricos.

Atualização de 20/11: **R4 publicada e validada somente no piloto**, com backups
restaurados antes/depois, cópia criptografada local e chave temporária removida.
CRM principal preservado. A análise de mensagens ainda não está pronta: faltam
recebimento/resposta/cancelamento reais demonstrados no ambiente hospedado.
[Publicação e evidências atuais](../INSTAGRAM-PILOT-R4-PUBLISHED-2026-11-20.md).
As atualizações anteriores abaixo são históricas.

Atualização de 18/11: vídeo de autorização confirmado como anexo persistido em
instagram_basic após upload manual pelo Chrome. Exclusão de mensagens preparada
e validada localmente; ainda não publicada. A revisão completa de mensagens não
está pronta para envio. [Estado verificado](PREPARATION-2026-11-18.md).

# Pacote de preparação da análise Meta

Aplicativo **ZapChat Social Lab** — 1684815669905187. Rascunho **1690021079384646**.
Estado em **18/11/2026: não enviado e ainda não apto à submissão**.

[Estado vigente: provedores, gravações reais e bloqueios restantes](PREPARATION-2026-11-18.md).
Os itens de 17/11 abaixo são históricos quando divergirem deste registro.

## Estado atual

- Piloto hospedado no servidor SistemaZapChat existente desde 16/11, com endereço
  e webhook independentes deste computador. Nenhum plano contratado ou serviço
  do CRM principal reiniciado. [Instalação, backup e reversão](../INSTAGRAM-SHARED-SERVER-DEPLOYMENT-2026-11-16.md).
- Conta @joaobosco.pro conectada na empresa do responsável. Avaliador
  `meta-review@example.com` em empresa distinta, sem acesso à conta/conversas do
  responsável. Senhas somente nos arquivos privados; nenhuma entregue à Meta.
- Onze verificações públicas passaram novamente em 17/11. Webhook ativo com
  messages e standby; token válido, associado ao app correto, com instagram_basic,
  instagram_manage_messages e public_profile. Nenhum envio real habilitado.
- Uma mensagem antiga “Teste ZapChat 15” foi relida com sucesso na Meta e preparada
  somente na cópia local, identificada como histórico. Isso comprova leitura de
  dados reais, não chegada pelo webhook. Nenhuma nova mensagem foi solicitada.
- A revisão R3 alinha a interface aos bloqueios do avaliador e recupera avisos
  temporários automaticamente. Build e teste local de queda/retomada passaram.
  Publicada somente no piloto em 17/11, após backup restaurado com dois usuários.
  Os seis serviços principais mantiveram IDs e horários de início. O acesso
  temporário autorizado foi removido às 15:23 UTC; nova conexão foi recusada.
- Automações, Assistente IA, Menus do Direct, Resultados e Laboratório continuam
  prévias, fora da demonstração de funcionalidades efetivas à Meta.
- Sessão pessoal do Facebook recuperada; instruções técnicas salvas no rascunho.
  O cadastro empresarial continua redirecionando para acesso pendente, impedindo
  verificar o cadastro por esse caminho. Razão social e país foram posteriormente
  localizados em documento empresarial compartilhado; campos preenchidos.
  Nenhuma declaração desconhecida sobre autoridades foi preenchida.

## Pendências para submeter

1. Declarações do responsável já preenchidas; completar os operadores e seus
   países de processamento/acesso com fonte aplicável ao serviço.
2. Revisão de interface publicada e validada; concluir o percurso reproduzível
   de avaliação antes de liberar credenciais ou apresentar o pacote como pronto.
3. Gravar o fluxo real completo de login, autorização e uso dos dados de cada
   permissão. A captura experimental de um frame e os vídeos sintéticos antigos
   não são uma gravação final.
4. Comprovar Direct real e concluir o acesso avançado. Teste assinado vazio,
   histórico importado e painel publicado não são confirmação de webhook real.
5. Revisar o pacote e obter a confirmação aplicável para concordâncias e envio
   final. Não aceitar termos ou preencher fatos desconhecidos por suposição.

[Roteiro e evidências de 17/11](RECORDING-PLAN-2026-11-17.md).
Os registros de 14–16/11 nos documentos vinculados são históricos; usar o estado
acima quando divergirem sobre hospedagem, conexão ou separação do avaliador.

## Material preparado

- [Evidências do CRM principal e ChatbotX](EVIDENCE.md): fontes com revisões fixadas,
  fatos reutilizáveis e limites do que cada fonte demonstra.
- [Justificativas e instruções do avaliador](REVIEWER-GUIDE.md): textos em inglês
  para o formulário, restritos à função efetiva do piloto.
- [Roteiro e pendências técnicas](DEMONSTRATION.md): etapas para a gravação e
  critérios para não apresentar uma simulação como entrega real.
- [Respostas sobre dados e decisões pendentes](DATA-HANDLING.md): dados encontrados,
  campos sem fonte e procedimento proposto para adoção pelo responsável.
- `assets/zapchat-icon-transparent-1024.png`: ícone com transparência, no tamanho
  exigido, baseado no símbolo existente no favicon do CRM. A versão JPEG com
  fundo branco foi recusada pela Meta; não usar essa versão na submissão.

Permissões limitadas a **instagram_basic** e **instagram_manage_messages**.
Nenhuma permissão de anúncio, publicação, comentários ou Human Agent solicitada.
Solicitar a permissão não comprova seu uso integral nem assegura aprovação.

## Dados existentes reaproveitados

| Campo | Valor e limite |
| --- | --- |
| Produto | SistemaZapChat; aplicativo isolado ZapChat Social Lab |
| Portfólio proprietário do app | Xtrategy Digital Marketing, verificado na Meta |
| Política | https://sistemazapchat.com/privacy |
| Exclusão | https://sistemazapchat.com/data-deletion |
| Termos existentes | https://sistemazapchat.com/terms; descrição antiga de WhatsApp, não prova publicação do Instagram |
| Privacidade | privacidade@sistemazapchat.com; entrega da caixa não auditada |
| Contato existente | contato@sistemazapchat.com |
| Responsável citado no CRM | bertramvictor8@gmail.com; e-mail não informa nome legal nem país |
| Contato do desenvolvedor na Meta | joaobosco_382@hotmail.com; mantido como cadastrado |
| Categoria | Negócio e Páginas |

## O que ainda depende do responsável

1. Razão social e país localizados: XTRATEGY DIGITAL MARKETING (FZE), Sharjah,
   Emirados Árabes Unidos. Preenchidos no rascunho com base no documento
   empresarial compartilhado e contexto confirmado pelo responsável em 17/11.
2. Declarações confirmadas pelo responsável em 17/11: não houve fornecimento a
   autoridades por segurança nacional nos últimos 12 meses; os procedimentos
   apresentados ainda não estão formalizados. Respostas salvas no rascunho.
   Completar a relação de operadores e seus países de processamento/acesso.
3. O acesso externo separado está hospedado e foi verificado. Fornecer somente
   a credencial de meta-review@example.com nos campos privados da análise,
   quando o pacote estiver completo. O proprietário usa outra empresa no piloto.
4. Revisar as concordâncias e o envio final quando o pacote estiver completo.
   Nenhuma concordância final foi aceita e o rascunho não foi submetido.

**Não é necessário pedir novas mensagens ao usuário nesta preparação.** A gravação,
o ambiente externo e os ajustes técnicos de demonstração são tarefas do projeto,
não solicitações para o usuário repetir os testes anteriores.

## Limites de publicação

Não substituir o URL de acesso do avaliador pelo CRM de produção: o módulo
Instagram não está publicado ali. O hostname instagram-lab.sistemazapchat.com
atualmente expõe apenas callback/webhook; não é um endereço de painel disponível
para login. Não cadastrar esse hostname como Website funcional antes de preparar
e verificar um serviço externo autenticado de avaliação.

Não enviar vídeos com credenciais, códigos OAuth, tokens, mensagens ou nomes de
clientes. Nenhuma conversa real foi exportada para este pacote. Não alterar o CRM
principal, seus termos ou sua infraestrutura para preencher lacunas da revisão.

[Atualização instalada em 17/11, backup e revogação](../INSTAGRAM-PILOT-UPDATE-2026-11-17.md).
