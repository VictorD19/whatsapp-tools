# Acesso GitHub — conferência em 12/11/2026

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
