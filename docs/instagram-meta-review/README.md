# Pacote de preparação da análise Meta

Aplicativo **ZapChat Social Lab** — 1684815669905187. Rascunho **1690021079384646**.
Estado em **17/11/2026: não enviado e ainda não apto à submissão**.

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
  Ainda aguarda autorização de acesso temporário para publicação só no piloto;
  o acesso de 16/11 foi removido e não foi reativado silenciosamente.
- Automações, Assistente IA, Menus do Direct, Resultados e Laboratório continuam
  prévias, fora da demonstração de funcionalidades efetivas à Meta.
- O Facebook pessoal pediu nova autenticação; uma nova aba visível foi aberta
  para o responsável. A sessão da Página não substitui a do administrador.

## Pendências para submeter

1. Acessar o rascunho com a sessão pessoal e consultar o cadastro legal do
   controlador. Confirmar declarações factuais sem fonte no código.
2. Publicar a revisão de interface somente no piloto, após validar seu backup.
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

1. Nome legal e país de quem controla os dados deste app. O cadastro do portfólio
   Xtrategy existe, mas a consulta de detalhes pediu autenticação de dois fatores.
   O responsável pode concluir isso diretamente na Meta para permitir a leitura;
   não deve enviar códigos, senha, documento ou token pelo chat. Se o controlador
   for diferente da empresa do portfólio, é preciso informar essa diferença.
2. Histórico real de fornecimento de dados a autoridades por segurança nacional
   nos últimos 12 meses e quais processos já são adotados. Não há essa informação
   no código, nas páginas legais nem nas notas do projeto. Não marcar Não ou
   declarar processos existentes por ausência de um registro no GitHub.
3. O acesso externo separado está hospedado e foi verificado. Fornecer somente
   a credencial de meta-review@example.com nos campos privados da análise,
   quando o pacote estiver completo. O proprietário usa outra empresa no piloto.
4. Revisar as concordâncias e o envio final quando o pacote estiver completo.
   Nenhuma concordância ou declaração foi aceita em nome do responsável.

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
