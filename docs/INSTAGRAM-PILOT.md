# Instagram — piloto isolado

Preparado em 09/11/2026, Asia/Dubai. Base: `VictorD19/whatsapp-tools`,
`master@755f310a206953d4436efb99da00c88b0672c0e5`.
Branch local: `codex/instagram-test-2026-11-09`.

## Estado

Atualizado em 12/11/2026: piloto local com conta Meta real @joaobosco.pro, OAuth
renovado com sucesso após ativação do app separado ZapChat Social Lab. Token
válido, criptografado no banco local; envio real desligado. Webhook HTTPS verificado
e evento sintético Meta recebido. Dois Directs reais existem na Meta, mas ainda
não foram recebidos/persistidos no piloto. Novo teste após renovação solicitado;
não declarar recebimento ou resposta reais aprovados antes da confirmação.

Implementados Direct de texto, conversas persistidas, respostas manuais, paginação
e isolamento por empresa, com simulação validada e componentes/cores do CRM.
E-mail, IA, comentários, funis, anexos e importação do histórico ficam para etapas
posteriores. A lista mostra até 50 conversas recentes; atualização é manual.

Branch remota preservada e PR 118 em rascunho no repositório original do Victor,
via GitHub CLI autorizado pelo usuário; o MCP permanece com 403. PR 117 contém
somente as duas páginas legais já publicadas separadamente. Sem merge/auto-merge
ou novo deploy nesta rodada; o módulo Instagram não está no CRM principal.
Consultar os registros datados abaixo para distinguir resultados de cada etapa.

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

## Diagnóstico do primeiro Direct real — 11/11/2026

O usuário confirmou o envio voluntário. A leitura da API Meta localizou a mensagem
de teste de @agenciainstapush para @joaobosco.pro às 17:21:33 UTC. Ela existe na
Meta, mas o banco do piloto continuou com zero conversas/mensagens reais; nenhum
POST correspondente chegou ao webhook. Não registrar esse teste como aprovado.

Token válido, app correto, escopos instagram_basic/instagram_manage_messages e
assinatura messages da conta foram confirmados por consultas somente leitura.
O evento sintético enviado pelo botão Teste da Meta chegou ao endpoint às
17:26:30 UTC e foi tratado com sucesso; a conta fictícia foi ignorada. Isso valida
o transporte sintético, não o recebimento de um Direct real.

A documentação oficial de webhooks, atualizada em 20/10/2026, informa que o app
precisa estar publicado/Live para receber notificações dos usuários:
https://developers.facebook.com/documentation/instagram-platform/webhooks/setup
O ZapChat Social Lab ainda está não publicado. A tela Publicar mantém o botão
desabilitado e aponta URL da Política de Privacidade; em Básico essa URL está
vazia, assim como termos, instruções de exclusão e categoria. A política atual
no código cobre WhatsApp e identifica outro responsável, portanto não foi
vinculada automaticamente ao novo app. Validar política e responsável antes
de salvar ou solicitar ativação. Publicação/Live ainda depende de confirmação
específica e não equivale a aprovação de acesso para clientes externos.

Nenhuma alteração de produção ou publicação Meta foi executada. Envios reais
permanecem desligados. Após cumprir os requisitos e obter autorização para
Live, repetir o teste com uma nova mensagem e só então validar uma resposta.

## Minuta de privacidade — 11/11/2026

A política pública em https://sistemazapchat.com/privacy foi obtida por leitura
HTTP, exibindo atualização de 01/05/2026 e conteúdo de WhatsApp, sem Instagram.
Uma cópia foi preservada em `privacy-live-2026-11-11.html`. Preparada a minuta
integral `PRIVACY-INSTAGRAM-DRAFT.md`, com proposta no componente local de
privacidade. Inclui dados de conta/Direct, finalidade, Meta e Cloudflare no piloto,
tokens criptografados, isolamento entre empresas, limitações atuais, desconexão
e solicitação de exclusão. Não promete importação de histórico nem uso de IA.

A minuta preserva os contatos existentes, pendentes de confirmação do responsável
e do canal de atendimento. A promessa geral preexistente de exclusão em 30 dias
precisa de procedimento operacional validado; o piloto não implementa rotina
de exclusão de conversas. A data da página existente não foi alterada enquanto
a proposta não for publicada. Nenhum deploy ou alteração no painel Meta ocorreu.

## Procedimento operacional de exclusão preparado — 11/11/2026

O usuário orientou manter os dados de contato já existentes. Política atualizada
no laboratório, com data local de 11/11/2026, e página `/data-deletion` criada com
instruções de solicitação, escopos, verificação de identidade e confirmação.
O canal de privacidade foi mantido; nenhum e-mail foi enviado para testá-lo.

`tools/instagram-data-deletion.mjs` prepara prévia privada e exige confirmação
para excluir conexão completa ou conversa de participante. Usa somente banco
e Redis fixos do laboratório, exige API parada e verifica os registros antes
de concluir a transação. Cancela OAuth pendente da empresa na exclusão completa.
Não revoga permissões nem exclui mensagens na Meta. Retenção e backups exigem
conferência administrativa por pedido, conforme `INSTAGRAM-DATA-DELETION.md`.

Dois testes unitários e ensaio real com PostgreSQL/Redis passaram. Inclui
prévia alterada recusada, isolamento por empresa, exclusão por participante,
exclusão completa e percurso CLI com plano/comprovante de permissão 600.
Conta Meta real, tabelas WhatsApp e usuários foram preservados. Somente dados
fictícios do ensaio foram excluídos. API reativada, envio real desligado.
Páginas locais responderam 200 e instruções de exclusão foram conferidas no
navegador. Nenhuma publicação Meta, deploy, push ou alteração de produção.
As páginas ainda não têm URLs públicas acessíveis à Meta; o túnel não foi ampliado.

Proteção adicional: ao excluir uma conversa, o utilitário registra no Redis
hashes de escopo e horário, sem conteúdo, para impedir recriação por reentrega
de evento antigo da Meta. Mensagem posterior pode iniciar nova conversa.
Falha no Redis bloqueia persistência. Exclusão completa remove também essa
proteção da conta. Final: 39 testes do módulo Instagram passaram, incluindo
reentrega ignorada, evento novo aceito e indisponibilidade de Redis sem gravação;
os dois testes do utilitário e integração PostgreSQL/Redis/CLI passaram. Esse
registro mínimo foi descrito na política e nas instruções locais.

## Páginas públicas e backup — conclusão em 12/11/2026

Sob autorização específica, somente /privacy e /data-deletion foram publicados
no sistemazapchat.com em 11/11 às 23:59 (Asia/Dubai), a partir da branch isolada
codex/privacy-pages-2026-11-11, commit 41e3f8b. Imagem principal continua sem
módulo Instagram. Apenas web foi recriado: API, PostgreSQL, Redis, Evolution e
MinIO preservaram IDs e horários. Login, termos, páginas, navegação interna,
saúde e prontidão foram conferidos pela internet. Política conferida no navegador.

Antes da troca: backups manuais dos dois bancos, configuração, Redis e mídia,
restauração isolada e contagens iguais, mídia extraída e aberta em MinIO sem rede,
Redis carregado sem consumidores e imagem anterior testada. Cópia externa age
v1.3.2 de 11.255.124.952 bytes teve SHA-256 e abertura integral confirmados.
O primeiro invólucro CMS falhou na verificação local e foi substituído; os
artefatos foram preservados após rejeição automática da exclusão sem autorização.

Acesso SSH temporário autorizado por até duas horas foi revogado às 00:06 de
12/11 (Asia/Dubai), preservando outros acessos; nova autenticação com a chave
foi recusada. Nenhum segredo consta neste registro. Roteiro completo em
PRIVACY-PAGES-RELEASE.md. Sincronização dos dois fontes no GitHub ainda bloqueada
pela permissão de escrita da integração: resolver antes de próximo build/deploy
normal para não repor páginas antigas. Branch, bundle e imagens preservados.
Aplicativo Meta não foi publicado nem teve permissões ampliadas nesta etapa.

## Ativação do aplicativo separado — 12/11/2026

Após confirmação específica do usuário, o botão Publicar foi acionado no app
ZapChat Social Lab (1684815669905187). A Meta confirmou "Seu app foi publicado
com sucesso" e passou a mostrar Publicado. Isso ativa o aplicativo Meta separado;
não publica o módulo no CRM principal nem comprova liberação para outros clientes.

URLs legais salvas no painel: https://sistemazapchat.com/privacy,
https://sistemazapchat.com/terms e https://sistemazapchat.com/data-deletion.
O túnel anterior deixou de resolver DNS. Novo endereço do laboratório:
https://single-susan-athletes-strength.trycloudflare.com, limitado pelo gateway
a callback OAuth e webhook. Callback registrado e API local reiniciada, com
banco/Redis próprios preservados. Nenhuma alteração em produção nesta rodada.

A assinatura do aplicativo foi atualizada e relida: objeto instagram, apenas
messages v27.0. Verificação HTTPS retornou 200 com desafio exato. O evento
sintético enviado pelo painel Meta chegou à API em 12/11 às 15:14:56 Asia/Dubai
e recebeu resposta de sucesso, sem criar conversa para a conta fictícia.

O token autorizado foi conferido por leitura: válido, SYSTEM_USER, app correto,
escopos instagram_basic, instagram_manage_messages e public_profile. A consulta
subscribed_apps da conta retorna subscribed_fields sem identificador do app,
mesmo pedindo id/name; não interpretar ausência desse identificador como ausência
de inscrição. POST idempotente de messages após a ativação retornou success:true;
GET posterior confirmou o campo. Não foram alteradas inscrições de outros apps.

O usuário enviou dois novos Directs de teste. A leitura da Meta confirmou ambos,
às 11:10:39 e 11:16:12 UTC (15:10 e 15:16 Asia/Dubai). Ainda não chegaram como
eventos reais ao piloto: zero conversas/mensagens na conta Meta local na última
consulta. Conversas simuladas antigas no mesmo laboratório não contam como
recebimento real. Não importar/injetar as mensagens para simular aprovação.

O usuário confirmou no celular que Permitir acesso às mensagens está ativado.
Foi iniciada renovação OAuth da mesma conta após a ativação do app; a Meta
exibiu novamente aceite dos Termos na tela Log in as joaobosco.pro. Solicitada
confirmação específica antes de continuar. Recebimento e resposta reais seguem
pendentes; realSendingEnabled permanece false.

GitHub: PRs 117 (duas páginas) e 118 (piloto), ambos em rascunho; testes da API e
Docker Build passaram nos dois. Sem merge/auto-merge, sem novo Deploy.

## Renovação concluída após expiração — 12/11/2026

O primeiro retorno levou de 15:24:50 a 15:47:10 Asia/Dubai, além dos 600 segundos
de validade do estado OAuth. Retornou erro genérico; a credencial anterior no
banco foi preservada, comprovada por comparação privada de hash do ciphertext.
Não foi ampliado o prazo nem contornada a validação de estado de uso único.

Após autorização do usuário, novo pedido iniciado às 15:49:09 e concluído às
15:50:54 Asia/Dubai (11:50:54 UTC). Mesmos ativos: portfólio Joao Bosco e
@joaobosco.pro, sem conta de anúncios; mesmas permissões de perfil e mensagens.
Callback exibiu Instagram conectado. A credencial foi atualizada no banco local
e a Meta confirmou token válido do app correto com os mesmos escopos.
Envio real permaneceu desligado. Solicitada nova mensagem voluntária de teste
após a renovação; recebimento real ainda pendente neste registro.
