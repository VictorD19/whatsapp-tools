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

O comando `api` continua forçando simulação. Não basta clicar em conectar para acessar
uma conta real. Preparar um ambiente de testes próprio, sem banco ou credenciais
de produção, URL HTTPS e aplicativo Meta apropriado. Configurar com segurança:

```text
INSTAGRAM_ENABLED=true
INSTAGRAM_MODE=meta
INSTAGRAM_PILOT_TENANT_IDS=<empresa de teste>
INSTAGRAM_SEND_ENABLED=false
INSTAGRAM_APP_ID=<aplicativo Meta de teste>
INSTAGRAM_CONFIG_ID=<configuração do login unificado>
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

## Preparação do aplicativo separado — 09/11/2026

No código do commit-base, a integração Meta existente é a Conversions API:
`apps/api/src/modules/meta-capi`. Ela usa Pixel ID, token e regras de eventos;
não fornece login ou permissões de Direct. O ambiente local não tinha credenciais
Instagram. Isso não prova ausência de um aplicativo no painel Meta nem no ambiente
interno de produção, que não foi acessado. O conector DigitalOcean consultado não
ofereceu inspeção por SSH. O painel Meta pediu login, pendente do usuário.

Preparar um aplicativo independente chamado **ZapChat Social Lab**, mantendo
os aplicativos e integrações existentes intactos. No painel autenticado, conferir
primeiro a lista de aplicativos e o produto Instagram dos candidatos. Para um
aplicativo separado, selecionar o caso de uso de gestão de mensagens do Instagram,
configurar Instagram Login e somente as permissões necessárias ao primeiro teste:
`instagram_basic` e `instagram_manage_messages` (login unificado).
Usar conta profissional de testes e cadastrar os papéis/testadores exigidos pelo
painel. Não publicar o aplicativo nem aprovar acesso de clientes nesta etapa.

O laboratório agora aceita uma configuração privada separada:

```sh
node tools/instagram-lab.mjs meta-init
# Preencher .instagram-test/meta.json em editor local protegido.
node tools/instagram-lab.mjs meta-check
# Somente após campos completos e endereço HTTPS de testes preparado:
# encerrar o processo api simulado antes de ocupar novamente a porta 18001.
node tools/instagram-lab.mjs api-meta
```

`meta-init` preserva arquivo existente e gera apenas o token de verificação local.
O arquivo tem permissão 600 e fica ignorado pelo Git. Campos: `appId`, `configId`, `appSecret`,
`verifyToken`, `apiVersion`, `redirectUri`, `sendEnabled` (inicialmente false).
Usar ID/segredo do aplicativo Meta de testes para o login unificado,
sem reutilizar token de anúncios. Nunca colar segredos no chat/Obsidian.

`meta-check` lista somente campos faltantes, sem imprimir segredos. Confere
formato, não valida credenciais com a Meta. `api-meta` recusa configuração
incompleta e mantém o banco/Redis/JWT locais: o arquivo não pode sobrescrever
DATABASE_URL ou outras configurações do CRM. Os quatro testes desse carregador
passaram. Os 534 testes anteriores da API permanecem como validação do commit
215ef2e; não houve mudança na API nesta preparação.

Ainda falta disponibilizar um endpoint HTTPS para OAuth e webhook, sem expor
painel administrativo ou credenciais. Nenhum túnel, DNS ou servidor público foi
criado nesta etapa. Com o host confirmado, cadastrar o callback exato e webhook
do aplicativo; conferir a assinatura `messages` e validar recebimento antes de
alterar `sendEnabled`. Não habilitar envio real só para passar no diagnóstico.

Fontes: [coleção oficial Meta Instagram API](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api),
painel Meta Developers (login solicitado), código local da integração Meta CAPI.


## Conferência do painel Meta após login

A conta autenticada mostrou sete aplicativos. O candidato Zap Flame
(ID 2940332392928583) está em desenvolvimento e sua lista de casos de uso contém
somente WhatsApp. Cinco outros aparecem como Conversions API Application e um
como Novarj, de outro portfólio. Não foi comprovado que Zap Flame é o aplicativo
usado pelo CRM em produção; não foi alterada sua configuração.

O assistente de criação do aplicativo separado foi preenchido com o nome
**ZapChat Social Lab**, caso de uso **Gerenciar mensagens e conteúdo no Instagram**,
e sem conexão a um portfólio empresarial nesta etapa. O nome inicial com
“Instagram” foi recusado pela regra de marca da Meta. A revisão final exige
aceitar os Termos da Plataforma e as Políticas do Desenvolvedor. O usuário confirmou esse aceite e a criação foi concluída.
Aplicativo: 1684815669905187; configuração: 1680712757031270. O usuário também
autorizou o vínculo à Xtrategy Digital Marketing, confirmado pelo painel após
a verificação de dois fatores. A configuração salva solicita somente
instagram_basic e instagram_manage_messages. Aplicativo ainda não publicado.


## Login unificado e endpoint temporário

A Meta confirmou no painel que aplicativos novos exigem **Unified Login**.
O adaptador foi atualizado para OAuth com config_id em facebook.com, troca de
código e chamadas em graph.facebook.com. Descobre a conta por
/me/assigned_instagram_accounts e preserva client_business_id, pois /me representa
o usuário do sistema. Neste piloto deve ser autorizada exatamente uma conta.
Token sem prazo informado ou expires_in=0 é armazenado sem vencimento; revogação
ou erro exige nova autorização. Nova coluna clientBusinessId migrou somente no
PostgreSQL do laboratório. API TypeScript e 538 testes passaram; sete testes dos
auxiliares de configuração/gateway/formulário passaram. Simulação HTTP revalidada.

Fonte: [guia oficial de login unificado da Meta](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-unified-login/get-started).

O usuário autorizou endereço temporário Cloudflare. Gateway local 127.0.0.1:18002
aceita apenas GET /api/v1/instagram/callback e GET/POST /api/v1/instagram/webhook;
não encaminha Authorization/Cookie. Destino fixo local, limite de corpo de 1 MB,
sem logs de query/body. Rotas privadas recebem 404. Cliente cloudflared oficial
2026.10.7 baixado para pasta ignorada pelo Git. Nenhum DNS ou recurso de produção
foi alterado. O endereço temporário atual está no arquivo privado meta.json;
se o túnel reiniciar, conferir e atualizar callback no painel e arquivo local.

```sh
node tools/instagram-webhook-gateway.mjs
# Em outro terminal, após autorização para tornar os callbacks acessíveis:
.instagram-test/cloudflared tunnel --no-autoupdate --url http://127.0.0.1:18002 --protocol http2
```

Para transferir o segredo sem imprimi-lo no chat, existe formulário temporário
somente em loopback, com origem/Host/nonce verificados, arquivo de saída 600 e
respostas sem o valor da chave. Não usa túnel e encerra após 30 minutos:

```sh
node tools/instagram-secret-setup.mjs
# Abrir http://localhost:18003 e salvar a chave do aplicativo de testes.
```

Fechar esse processo após salvar. Não colocar o formulário no gateway nem em
produção. A reautenticação solicitada pela Meta deve ser concluída pelo próprio
usuário no painel. Até a chave ser salva e a API reiniciar em api-meta, o piloto
continua simulado. Ainda não houve conta Instagram autorizada ou envio real.


## Uso por clientes e estado ao fim da configuração

O produto final é multiempresa: um aplicativo da plataforma atende autorizações
independentes de cada cliente. O cliente não informa sua senha ao CRM, não muda
seu Instagram para o portfólio da Xtrategy e escolhe os próprios ativos no OAuth.
A empresa que iniciou o fluxo é vinculada no estado de uso único; tokens e
conversas são armazenados por tenantId. Cada autorização deste MVP aceita uma
conta por vez; é possível repetir a conexão para outra conta autorizada.

O usuário confirmou que a funcionalidade deve atender outros clientes, não só
seu perfil. O piloto continua restrito à empresa fictícia para validação. Antes
de oferecer a clientes sem papel no aplicativo, concluir análise da Meta,
Advanced Access das permissões e publicação do aplicativo. Somente contas
profissionais são elegíveis. Não convidar cada cliente como testador para
substituir a análise do aplicativo.

A chave Meta foi transferida pelo formulário local para meta.json sem exibi-la
no chat. Formulário e transferência do verificador foram encerrados. API local
reiniciada em modo meta; envio real permanece false. O webhook foi verificado
e salvo no painel Meta e o campo messages ficou Assinado em v27.0. Teste público
externo: callback sem autorização 400; login e rotas privadas 404; desafio de
webhook correto 200 com valor exato. Nenhuma conta Instagram foi autorizada
até este registro. OAuth abriu a seleção de ativos; não aceitar o portfólio
de cliente selecionado automaticamente pela Meta. A escolha do @ de teste e
o consentimento de acesso ainda dependem do usuário.

Ajustes de integração: contas simuladas não aparecem no modo Meta; tokens do
login unificado sem vencimento programado são aceitos, enquanto tokens
explicitamente vencidos são bloqueados. Revalidar modo e token antes de enviar.
Testes cobrem autorizações de duas empresas, tokens separados e tentativa de
apropriação de conta de outra empresa.


## Retomada em 11/11/2026

Login direto do Instagram chegou a reconhecer @joaobosco.pro, cujo uso e acesso
aos Directs o usuário confirmou explicitamente. A Meta respondeu App not active
por estar em desenvolvimento; não houve callback/token real salvo. Cadastro de
testador por nome retornava Invalid id. O identificador profissional confirmado
pelo MCP Meta Ads é 17841400699000476. Usar esse identificador no formulário de
Testador do Instagram do assistente de geração de tokens criou o convite correto:
a tabela de funções confirmou joaobosco.pro / Testador do Instagram / Pendente.
Não cadastrar qualquer ID sem confirmar o username correspondente.

Após recarregar Apps e sites no Instagram da conta correta, a aba Tester Invites
apareceu com ZapChat Social Lab-IG. O aceite exige os Termos da Plataforma,
Políticas do Desenvolvedor e confirmação do vínculo como testador; foi pedida
confirmação específica ao usuário. Ainda pendente nesse registro. Isso vale para
o piloto, não substitui a análise para clientes da plataforma.

O túnel anterior expirou durante a pausa e foi renovado sob autorização já dada.
Novo host: mag-gave-terminal-succeed.trycloudflare.com. Configuração privada,
API local e callback no painel atualizados. API/interface locais responderam 200.
Webhook passou pela atualização no painel; conferir a assinatura messages antes
de enviar uma mensagem voluntária de teste. Envios reais continuam desligados.

O diálogo OAuth foi ajustado para os parâmetros que o painel Meta gera:
display=popup e override_default_response_type=true. Isso abriu o login direto
do Instagram que antes não avançava. Os sete testes do adaptador passaram após
esse ajuste. Nova autorização é necessária após expiração do estado de dez minutos.


## Conta real conectada — 11/11/2026

Após confirmação específica do usuário, o convite de Testador do Instagram foi
aceito: a página de convites passou a oferecer Remove no lugar de Accept.
Docker, PostgreSQL, Redis, API, interface e gateway do laboratório foram
reativados; nenhuma migração estava pendente. O túnel reativado nesta sessão é
concerned-personnel-derby-extension.trycloudflare.com. Configuração privada,
callback OAuth e webhook da Meta foram atualizados para esse host. Handshake
HTTPS retornou 200 com desafio exato; campo messages permaneceu Assinado em v27.0.

A autorização pelo Instagram foi concluída com @joaobosco.pro, portfólio do
cliente Joao Bosco e nenhuma conta de anúncios selecionada. A tela final pediu
identificação básica/perfil e acesso às mensagens, conforme autorizado. Callback
retornou Instagram conectado; a API confirmou conta mode=meta, active=true, e a
interface exibiu @joaobosco.pro · Meta. O segredo permanece em arquivo privado e
o token autorizado é criptografado pelo serviço do CRM no banco local.

**Envio real continua false.** Nenhuma mensagem foi enviada a contatos reais.
Na confirmação inicial havia zero conversas reais armazenadas. Foi solicitado
que o usuário envie Teste ZapChat de outra conta para validar o recebimento.
Conexão OAuth validada; recebimento de Direct e resposta real ainda não validados
até este registro. O histórico antigo não é importado automaticamente neste MVP.
