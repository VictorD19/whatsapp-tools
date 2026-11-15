# Cancelamentos e instância do avaliador — 15/11/2026

Estado posterior: [publicação externa e OAuth real](INSTAGRAM-REVIEW-EXTERNAL-2026-11-15.md).
Este documento registra a etapa local anterior; seus limites de DNS/callback
foram atualizados no registro posterior, sem alteração do CRM principal.

## Entrega desta etapa

Implementação restrita à branch de testes. Nenhum deploy, migração ou alteração
no CRM principal. Os envios reais continuam desligados. Nenhum Direct foi enviado
e nenhuma nova mensagem foi solicitada ao usuário.

### Cancelamento pelo remetente

O receptor agora reconhece is_deleted nas notificações messaging, standby e
changes de messages/standby. Exige assinatura válida, conta e participantes
coerentes, ID de mensagem e horário válidos. Aceita cancelamento recebido e
cancelamento de mensagem enviada, com direção e conversa delimitadas.

O texto persistido é esvaziado e o estado passa a unsent. Permanece um marcador
vazio com o identificador para que uma notificação repetida ou sincronização não
recrie o texto. Esse marcador também é criado quando o cancelamento chega antes
da mensagem original. A chave única conta/mensagem protege a inserção concorrente.
Cancelamentos são processados antes das mensagens originais num lote.

A operação não avança lastInboundAt nem atribui controle da conversa. Repetir o
mesmo cancelamento não altera a versão da conversa. Continua respeitando o corte
de exclusão administrativa; falha no Redis impede confirmar a operação.

A interface mostra Mensagem cancelada pelo remetente. Quando a conversa muda,
descarta páginas antigas em cache antes de buscá-las novamente, para não manter
texto removido fora das 50 mensagens mais recentes. Respostas atrasadas de uma
paginação anterior são descartadas. Um erro de atualização não confirma uma
revisão nova indevidamente.

O modo simulado ganhou Simular cancelamento. Essa ação exige admin autenticado,
tenant permitido, mensagem recebida e conta simulada; não está disponível em modo
Meta. Não se trata de um endpoint público de exclusão de mensagens reais.

Nenhuma nova coluna ou migração necessária. Não se afirma que notificações antigas
já descartadas serão reenviadas pela Meta ou que o histórico externo foi limpo.

## Ambiente independente do avaliador

Ferramentas: compose.instagram-review.yml e tools/instagram-review.mjs.

| Recurso | Instância do avaliador | Piloto conectado preservado |
| --- | --- | --- |
| Web | 127.0.0.1:18090 | 127.0.0.1:18080 |
| API | 127.0.0.1:18011 | 127.0.0.1:18001 |
| Postgres | 127.0.0.1:25432 / instagram_review | 127.0.0.1:15432 / instagram_lab |
| Redis | 127.0.0.1:26379 / 0 | 127.0.0.1:16379 |
| Compose | zapchat-instagram-review | zapchat-instagram-test |

Volumes, usuário, senha, segredos JWT/refresh e chave de criptografia próprios.
A API de avaliação carrega somente Core/Auth/Instagram e suas dependências,
sem iniciar os processadores de WhatsApp do AppModule completo. A Web e a API
usam cópias locais do código; a Web compila com webpack para suportar a resolução
de dependências dessa cópia. Nenhum segredo de provedor é herdado do shell ou
do laboratório conectado. Cwd separado evita carregar o .env do serviço original.

Estado após a demonstração: um tenant, um usuário, uma conta simulada, duas
mensagens fictícias (uma cancelada e uma resposta simulada), **zero tokens Meta**.
Sessões JWT dos dois pilotos foram testadas em ambas as direções e rejeitadas
com HTTP401 quando usadas no ambiente errado.

```sh
node tools/instagram-review.mjs prepare
node tools/instagram-review.mjs start
node tools/instagram-review.mjs status
```

prepare cria o ambiente se ausente, aplica migrações somente no banco de avaliação
e copia o build API já compilado e os fontes Web. Não redefine a senha de um
usuário existente. Usar com os processos de avaliação parados ao renovar a cópia
de código; não executar init do laboratório conectado. start recusa portas já
ocupadas e não encerra outros processos. start-web permite recuperar somente a
interface. Os PIDs e logs ficam em .instagram-test/reviewer, fora do Git.

A conta de serviço é instagram-review@example.com; a senha exclusiva permanece
no arquivo privado .instagram-test/reviewer/session.json (0600), sem cópia no
material de revisão, vídeo ou chat. Não compartilhar essa credencial com Meta
antes de preparar o acesso externo e revisar seu escopo.

Durante um ensaio local, o formulário herdado sem method expôs a credencial
exclusiva de avaliação em uma navegação GET antes da hidratação. O formulário
agora usa POST também no fallback sem JavaScript, a credencial foi substituída
e o log local afetado foi limpo. A credencial anterior foi invalidada. Nenhuma
senha do Instagram/Meta ou da produção estava envolvida. Login posterior por
POST foi confirmado. A gravação começa depois do login e não contém credenciais.

## Gravação produzida

[Vídeo da demonstração local](instagram-meta-review/assets/reviewer-demo-20261115.mp4)
e [captura final](instagram-meta-review/assets/reviewer-unsend-20261115.png).

Captura real do navegador: criação da conta fictícia, recebimento fictício,
resposta simulada, cancelamento e atualização. Aproximadamente 41 segundos,
sem áudio; intervalos ociosos limitados a 10 segundos na montagem do screencast.
Aviso de dados fictícios permanece visível. Nenhuma mensagem de cliente ou sessão
de login é apresentada. O MP4 foi decodificado integralmente sem erro.

**É uma prévia técnica, não o vídeo final de aprovação Meta.** Não demonstra
OAuth real, mensagem de usuário real por webhook, resposta real ou exclusão manual
pelo operador. Não carregar esse vídeo como prova de que essas etapas passaram.

## Verificação

- 59 testes Jest do módulo passaram, incluindo os testes da ferramenta provisória.
- Build API passou.
- Integração PostgreSQL com fixtures e rollback: esvaziamento, cancelamento antes
  da original, lote, repetição, sincronização posterior, standby, direção enviada,
  delimitação por participante, assinatura inválida, janela original preservada
  e idempotência; zero chamadas Meta. Comando: node tools/instagram-unsend.integration.mjs.
- HTTP real na instância de avaliação: autenticação, modo simulado, texto vazio,
  cancelamento protegido por login, repetição idempotente e isolamento JWT.
- Navegador: aviso de simulação, resposta fictícia, cancelamento e refresh sem
  restaurar o texto. Nenhuma falha TypeScript apontada nos dois TSX alterados;
  checagem global Web continua com erros preexistentes em outros componentes.

## Limites e próxima liberação

A instância escuta somente em loopback e depende do computador ligado. Não é um
Website externo para avaliadores Meta. Não houve alteração de DNS, túnel, WAF,
callback do app, concessão de permissão, compra ou publicação de servidor.

Para acesso externo será necessário publicar a cópia isolada com autenticação,
configurar OAuth/webhook correspondentes e validar o fluxo com autorização real.
Revisar especificamente essa exposição antes de habilitá-la. O envio real e o
formulário de Advanced Access não foram habilitados/enviados por esta etapa.
Nome legal/país e declarações organizacionais continuam aguardando confirmação.
