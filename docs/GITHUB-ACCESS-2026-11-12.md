# Acesso GitHub — conferência em 12/11/2026

## Resolvido por autenticação direta

O usuário concluiu a autorização oficial por dispositivo do GitHub CLI como
`fightmosquito-max`. Ferramenta oficial v2.103.3, asset macOS arm64 conferido pelo
SHA-256 publicado na API de releases. Credencial gerida pelo keyring do sistema;
nenhuma senha/token foi fornecida no chat. Não foi alterado o helper global do Git.

O push atômico das duas branches foi aceito no repositório original do Victor:

- `codex/privacy-pages-2026-11-11`, commit `41e3f8b`:
  https://github.com/VictorD19/whatsapp-tools/pull/117
- `codex/instagram-test-2026-11-09`:
  https://github.com/VictorD19/whatsapp-tools/pull/118

Ambos os PRs são rascunhos, sem merge nem auto-merge. PR 117 confirmado com
exatamente os dois arquivos das páginas. CI iniciou por evento pull_request;
nenhum novo Deploy foi acionado. Master permanece em `755f310a`.
O bloqueio do MCP permanece; o acesso compartilhado do usuário funcionou pelo Git.
Não é necessário novo acesso de colaborador nem renomear/transferir o repositório.

Antes de novo deploy produtivo, integrar as páginas com plano controlado para o
workflow atual, que publica API e web. Ter a branch salva evita perda da fonte,
mas não modifica master nem impede um build antigo de substituir as páginas.

## Diagnóstico anterior à autenticação direta

- Usuário conectado: `fightmosquito-max`.
- `VictorD19/whatsapp-tools`: resposta do repositório informa `push:true`,
  `admin:false`, branch padrão `master` em `755f310a206953d4436efb99da00c88b0672c0e5`.
- Instalações acessíveis: apenas conta `fightmosquito-max`, ID 175443886,
  seleção de todos os repositórios dessa conta. Nenhuma instalação VictorD19
  apareceu na consulta. Isso indica falta de cobertura da integração no destino;
  não é evidência de ausência de permissão de colaborador do usuário.
- Tentativa autorizada de criar `codex/privacy-pages-2026-11-11` na base confirmada:
  HTTP 403 `Resource not accessible by integration`. Nenhuma branch criada.
- Consulta específica de permissão de colaborador também retorna 403; não
  confundir essa limitação da integração com revogação de acesso do usuário.

## Ação necessária

Victor, proprietário, deve instalar/configurar a mesma integração GitHub na sua
conta, limitando acesso ao repositório whatsapp-tools. Conferir permissões
solicitadas para escrita de conteúdo e pull requests. Caso a integração não
ofereça escrita, alternativa é autenticar Git local pelo fluxo oficial do GitHub,
com a conta fightmosquito-max já autorizada como colaboradora, sem compartilhar
senhas ou tokens no chat. Não reutilizar credenciais do servidor/registry.

Após liberação: repetir teste de branch; salvar apenas os dois arquivos de
privacidade/exclusão em branch isolada e abrir PR. Não fazer merge direto:
push/merge em master/main dispara workflow de produção com API e web.
O pacote Instagram deve permanecer em branch separada.

## Retomada Instagram

Último teste documentado: OAuth real confirmado; Direct de teste existe na Meta,
mas não chegou ao banco do piloto. Evento sintético chegou ao webhook. App
permaneceu não publicado; recebimento e resposta reais ainda não aprovados.
As duas URLs legais já estão públicas. Retomar laboratório/túnel, conferir URLs
atuais e configurar páginas legais no app separado. Avaliar pendências exibidas
pela Meta antes de ativação Live autorizada. Repetir recebimento e só depois
habilitar resposta de teste. Acesso de clientes externos exige avaliação própria
das permissões/revisão Meta; Live sozinho não comprova liberação geral.

Referências oficiais:
- https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party
- https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps
