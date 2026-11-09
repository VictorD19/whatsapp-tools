# Instagram — piloto isolado

Preparado em 09/11/2026, Asia/Dubai. Base: `VictorD19/whatsapp-tools`,
`master@755f310a206953d4436efb99da00c88b0672c0e5`.
Branch local: `codex/instagram-test-2026-11-09`.

## Estado

Primeira etapa implementada: conta simulada, Direct de texto, conversas persistidas,
respostas manuais, paginação de mensagens e isolamento por empresa. A tela usa os
componentes/cores do CRM. Existe adaptador OAuth/webhook/envio Meta, ainda sem
validação com conta real. Nenhuma alteração foi aplicada ao servidor de produção.
E-mail, IA, comentários, funis, anexos e importação do histórico ficam para etapas
posteriores. A lista mostra até 50 conversas recentes; atualização é manual.

A criação da branch remota pelo MCP retornou HTTP 403, `Resource not accessible
by integration`, embora o usuário tenha permissão de escrita no repositório.
O Git local também não tem credencial para push. É necessário liberar escrita
da integração neste repositório ou autenticar o Git antes de publicar a branch.
Não enviar tokens ou senhas pelo chat. Nenhum push, PR, merge ou deploy ocorreu.

## Executar localmente

Pré-requisitos: Node compatível com o projeto, pnpm 10.30.3 e Docker iniciado.
Não copiar `.env` de produção. Os comandos abaixo usam somente banco/Redis locais.

```sh
pnpm install --frozen-lockfile --ignore-scripts
node tools/instagram-lab.mjs init
# Em dois terminais separados:
node tools/instagram-lab.mjs api
node tools/instagram-lab.mjs web
# Depois de ambos iniciarem:
node tools/instagram-lab.mjs smoke
```

Abra `http://localhost:18080/login`, entre como `instagram-lab@example.com`.
A senha gerada está somente em `.instagram-test/session.json`, ignorado pelo Git,
com permissão de arquivo 600. Não publicar esse arquivo. Navegue para Instagram
no menu ou `http://localhost:18080/instagram`. Crie uma conta de teste, simule uma
mensagem e responda. Nenhuma mensagem sai para a Meta nesse modo.

O laboratório usa API 127.0.0.1:18001, interface 127.0.0.1:18080, PostgreSQL
127.0.0.1:15432 e Redis 127.0.0.1:16379, volumes próprios e projeto Compose
`zapchat-instagram-test`. Não usa o Compose de produção. Mídia/MinIO não fazem
parte deste piloto. Para parar os serviços, encerre os dois terminais e execute:

```sh
docker compose -p zapchat-instagram-test -f compose.instagram-test.yml stop
```

Não excluir volumes se quiser preservar as conversas fictícias. Em macOS com
socket Docker Desktop fora do padrão, usar `docker --host
unix://$HOME/.docker/run/docker.sock compose ...`; o inicializador detecta esse caso.

## Proteções implementadas

- Módulo ausente por padrão e bloqueado quando `NODE_ENV=production`.
- Habilitação exige `INSTAGRAM_ENABLED=true` e empresa na lista explícita
  `INSTAGRAM_PILOT_TENANT_IDS`. Rotas administrativas usam autenticação do CRM.
- Menu depende de `NEXT_PUBLIC_INSTAGRAM_PILOT=true`; autorização final é da API.
- Tabelas novas não substituem as tabelas nem as sessões WhatsApp.
- Tokens Meta criptografados com o serviço AES existente; nunca retornam à tela.
- OAuth usa estado aleatório de uso único, armazenado no Redis por dez minutos.
- Webhook valida HMAC SHA-256 sobre corpo bruto e ignora ecos/duplicatas.
- Respostas exigem mensagem recebida nas últimas 24 horas, conta ativa e token
  válido. Envio real exige também `INSTAGRAM_SEND_ENABLED=true`.
- Chave de requisição e transição atômica evitam repetir o mesmo envio.
  Resultado incerto fica bloqueado para conferência, sem reenvio automático.
- Logs de requisição omitem query strings para não registrar códigos OAuth.

## Próximo teste com conta real

O inicializador local força simulação. Não basta clicar em conectar para acessar
uma conta real. Preparar um ambiente de testes próprio, sem banco ou credenciais
de produção, URL HTTPS e aplicativo Meta apropriado. Configurar com segurança:

```text
INSTAGRAM_ENABLED=true
INSTAGRAM_MODE=meta
INSTAGRAM_PILOT_TENANT_IDS=<empresa de teste>
INSTAGRAM_SEND_ENABLED=false
INSTAGRAM_APP_ID=<aplicativo de teste>
INSTAGRAM_APP_SECRET=<segredo no ambiente protegido>
INSTAGRAM_VERIFY_TOKEN=<valor aleatório no ambiente protegido>
INSTAGRAM_REDIRECT_URI=https://<host de testes>/api/v1/instagram/callback
INSTAGRAM_API_VERSION=<versão suportada confirmada no painel Meta>
```

Webhook: `/api/v1/instagram/webhook`. Confirmar no painel Meta os produtos,
permissões, conta profissional/testador, assinatura de mensagens e versão da API.
Executar o servidor de testes em modo não produtivo; a trava atual bloqueia
deliberadamente `NODE_ENV=production`. Não alterar o ambiente do CRM ativo.
Validar OAuth e recebimento antes de habilitar envio real; só então testar com
uma mensagem voluntária da conta de teste. Não houve esse teste real ainda.
Renovação automática de token e reconciliação de envios incertos ainda pendem;
token expirado exige reconexão. Desconectar remove o token deste ambiente, sem
revogar automaticamente permissões no painel da Meta.

## Validação de 09/11/2026

- Prisma gerado; migrações aplicadas somente ao PostgreSQL do laboratório.
- TypeScript da API: passou.
- Jest API: **34 suítes, 534 testes passaram**, incluindo 29 do Instagram.
- Percurso HTTP real com banco local: login, conta simulada, recebimento,
  resposta, deduplicação de entrada/saída, acesso entre empresas negado e 401
  sem autenticação. Nenhuma chamada à Meta.
- TypeScript web: **21 diagnósticos**, idênticos aos reproduzidos em cópia
  intocada do commit-base com as mesmas dependências. Nenhum diagnóstico novo.
  Estão em testes de planos, configuração Next/Sentry, traduções, ferramentas IA,
  gravação de áudio, editor e notificações. O frontend completo ainda não está
  com essa verificação verde; não tratar como pronto para publicação.
- Servidor web iniciou; revisão visual completa ficou pendente porque o Chrome
  estava em uso pelo usuário. O percurso de botões ainda precisa de validação.
- `master` remoto continuou no mesmo SHA após o trabalho.

## Antes de publicar

Revisar este código e as limitações acima, validar visualmente, testar a conta
Meta e resolver os impedimentos de qualidade relevantes. Antes de qualquer
merge que dispare deploy, demonstrar backup e restauração isolada do banco,
mídias, sessões e configuração, registrar versão/imagens ativas e ensaiar retorno.
O Compose de produção executa migrações automaticamente: rollback do código
sozinho não desfaz migrações. Esta migração apenas adiciona três tabelas/índices
e suas relações; não remove colunas ou dados antigos. Mesmo assim, revisar a
compatibilidade e preservar os dados novos se houver retorno.

Não mudar os workflows de deploy nem promover esta branch nesta etapa.
