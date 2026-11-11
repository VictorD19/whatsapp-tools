# Publicação somente das páginas de privacidade e exclusão

Autorização do usuário em 11/11/2026: atualizar apenas as páginas públicas no
sistemazapchat.com, depois de validar o backup, preservando as funcionalidades
em uso. **Publicação concluída em 11/11/2026 às 23:59, Asia/Dubai**
(19:59 UTC). Acesso temporário revogado em 12/11/2026 às 00:06, Asia/Dubai.

URLs verificadas: https://sistemazapchat.com/privacy e
https://sistemazapchat.com/data-deletion. Somente `wt-web` foi recriado.
API, PostgreSQL, Redis, Evolution e MinIO preservaram IDs e horários de início.

## Pacote isolado preparado

- Base atual confirmada no GitHub: `755f310a206953d4436efb99da00c88b0672c0e5`.
- Branch local: `codex/privacy-pages-2026-11-11`.
- Commit: `41e3f8bfbcf638eb316991bec9c2f898169ffba1`.
- Exatamente dois arquivos alterados em relação à base:
  `apps/web/src/app/(auth)/privacy/page.tsx` e
  `apps/web/src/app/(auth)/data-deletion/page.tsx`.
- Sem módulo Instagram, alterações de API, schema, migrações, credenciais,
  Compose ou workflow no pacote. Não publicar a branch do piloto por engano.
- Cópias transportáveis em `../privacy-pages-only.patch` e
  `../privacy-pages-only.bundle`. O bundle foi verificado localmente e requer
  o commit-base existente no repositório de destino.

As páginas descrevem o piloto isolado e o canal administrativo existente.
Publicá-las não habilita Instagram no CRM principal nem ativa o aplicativo Meta.
Não cadastrar no painel Meta uma URL nova antes de verificar seu conteúdo público.

## Constatações antes da publicação

O MCP DigitalOcean confirmou SistemaZapChat, Droplet `557124676`, ativo. A
consulta de política não retornou habilitação nem janela de backup; as features
não incluem backups. A lista de imagens de usuário retornou vazia. Isso não
descarta backup externo, mas não permite declarar recuperação validada.

O catálogo MCP não expôs execução de comandos no Droplet. Os resultados de
execução encontrados são de MicroVM/sandbox, não do servidor de produção;
não utilizá-los como se fossem acesso ao SistemaZapChat. Nenhuma chave SSH
local foi encontrada; GitHub Secrets não deve ser extraído.

A criação da branch remota pelo conector GitHub retornou 403, Resource not
accessible by integration. A conta declara push:true, mas isso não prova que
a integração possui permissão de escrita. Não houve push ou alteração remota.

O workflow atual, em push de master/main, publica API e web, reinicia ambos e
executa migrações na inicialização da API. Esse percurso não satisfaz a exigência
de publicar somente as páginas sem tocar nas funcionalidades ativas. Preparar
publicação controlada somente da interface após inspeção do servidor; não
acionar o workflow geral como atalho.

## Validação necessária no console

1. Confirmar o host, diretório real do projeto, versão em execução e eventuais
   mudanças locais. Inventariar containers, IDs/digests das imagens, mounts e
   espaço disponível, sem imprimir ambientes, segredos ou conversas.
2. Localizar backups existentes e conferir escopo, data, integridade e acesso
   ao material necessário à recuperação. Se não existirem, preparar cópia
   consistente com recursos reais do servidor antes da publicação. Não
   desligar o CRM ou restaurar dados sobre a produção para testar um backup.
3. Registrar e preservar a imagem estável da interface e sua configuração,
   ensaiando a recuperação em ambiente isolado. Verificar separadamente a
   recuperação dos dados abrangidos pelo backup, com consumidores e envios
   desligados. Um download da página pública ou cópia do Git não valida o banco.
4. Confirmar a compatibilidade do pacote com a versão ativa. Construir/verificar
   somente a interface e publicar sem reiniciar API, banco, Redis, Evolution
   ou outros serviços. Escolher os comandos após confirmar o ambiente real;
   o Compose do Git não prova o que está instalado no servidor.
5. Preservar as rotas existentes e verificar `/privacy`, `/data-deletion`,
   `/login` e saúde pública antes/depois. Confirmar escopo e conteúdo das páginas.
6. Em falha de interface, retornar à imagem/configuração anterior da interface.
   Não restaurar um banco antigo para desfazer uma mudança de texto.

## Estado

O usuário habilitou acesso SSH temporário de até duas horas após confirmação
específica. A chave fica somente na pasta privada ignorada pelo Git; seu acesso foi
revogado ao concluir e uma nova autenticação foi recusada. Console web não expôs saída legível para a automação;
nenhum resultado foi presumido a partir do prompt root.

O acesso direto confirmou o host, commit-base e containers reais. Havia apenas
um dump antigo parcial do Evolution; não foi tratado como backup completo.
Foi criada uma cópia manual atual em diretório root privado, com testes:

- `whatsapp_tools`: 39 tabelas e 1.064.001 linhas; restauração isolada e contagens
  de todas as tabelas iguais às do mesmo snapshot exportado pelo PostgreSQL.
- `evolution`: 37 tabelas e 170.889 linhas; mesmo teste de restauração/contagem.
- Mídia: arquivo de 10.816.163.840 bytes, extraído e comparado; MinIO restaurado
  sem rede, 22.250 objetos listados e três objetos lidos como amostras. A
  comparação com a origem encontrou apenas modificação do horário de um
  metadado interno, sem divergência de conteúdo.
- Redis: snapshot nativo, integridade validada e carga em instância isolada,
  sem consumidores de filas; PONG e 15.154 chaves no banco padrão. Chaves com
  expiração podem desaparecer naturalmente entre snapshot e teste.
- Configuração/segredos, globals do PostgreSQL, metadados dos containers e
  imagem estável da interface preservados em local privado. A imagem anterior
  abriu a política em container sem rede, comprovando a possibilidade de retorno.

Não foi iniciada nenhuma cópia do CRM ou Evolution com sessões reais. Os bancos
e a mídia foram capturados separadamente: não declarar snapshot atômico de
todos os serviços nem recuperação integral dos fluxos de atendimento a partir
desse ensaio. Nenhum banco original foi restaurado ou migrado.

Os seis containers de produção permaneceram com os mesmos IDs e horários de
inicialização durante as cópias/testes. A verificação pública de saúde, prontidão,
login, privacidade e termos respondeu 200 antes da publicação.

A primeira embalagem OpenSSL CMS falhou na verificação local do arquivo grande
e não foi aceita como cópia de recuperação. Foi substituída por **age v1.3.2**,
obtido do projeto oficial e conferido pelos hashes publicados. Um teste com
3 GiB e depois a abertura integral do backup real passaram, sem gravar os dados
decifrados em disco no computador. Os arquivos CMS foram preservados: a revisão
automática recusou sua exclusão por falta de autorização expressa. Eles não são
o formato de recuperação validado.

Cópia válida: `zapchat-privacy-backup-20261111.age`, 11.255.124.952 bytes,
SHA-256 `9cd5cc550eb519f2e3672a77b7ffa12dd1ede7ed0c954ee4917c82c6652292a7`.
Ela está no servidor e no computador do proprietário, em pasta privada ignorada
pelo Git. A identidade privada de recuperação age permanece somente nesse
computador, separada da chave SSH temporária. Não copiar chaves para Git/Obsidian.

Referência técnica da limitação examinada: [OpenSSL CMS streaming](https://docs.openssl.org/master/man1/openssl-cms/)
e [discussão oficial sobre decifração em fluxo](https://github.com/openssl/openssl/issues/26372).

A imagem nova foi construída fora do servidor, a partir apenas da branch das
duas páginas. Login, termos, política, exclusão e navegação interna Next foram
testados. `/instagram` continua 404 nesse pacote. No servidor, 73 arquivos
estáticos compartilhados são idênticos; quatro arquivos antigos adicionais
foram preservados para abas já abertas. Sem conflitos de conteúdo.

A nova pergunta sobre incorporar Instagram ao principal não revogou os limites
da publicação autorizada; recebimento/resposta real e liberação Meta continuam
pendentes antes de qualquer promoção do piloto.

## Resultado e retorno

Imagem anterior: `sha256:fc915f55d888205b23b5a16661a0112595f833c82219596111d2f4cdcdb2ff16`.
Imagem publicada: `sha256:8f214b31e9ac7598b2ac1396b185d924c5d6c0a696b8781d8bbdcfac4e558241`.
O pacote publicado contém somente as duas páginas; `/instagram` permanece fora
da imagem principal. Nenhuma migração ou alteração de credenciais de produção.

Troca executada com o Compose produtivo e override de imagem apenas de web,
usando `--no-deps --no-build --pull never web`. A versão de retorno foi
preservada e testada. Overrides e instruções estão em
`/root/zapchat-privacy-release-20261111`, privado ao administrador.
O checkout master e o arquivo não rastreado preexistente foram preservados.

Pela internet, política, exclusão, login e termos responderam 200; saúde `ok`,
prontidão `ready` e navegação interna Next passaram. A política nova também foi
conferida no navegador. A chave SSH temporária foi removida sem alterar as
demais entradas; uma nova autenticação com ela foi recusada.

**Pendência antes de outro deploy:** a integração GitHub continua sem escrita
(403), e o Git do servidor não tem autenticação de push. A branch/bundle e a
imagem estão preservados localmente e no servidor, mas a fonte ainda precisa
ser consolidada no GitHub. Um build/pull normal da versão antiga pode substituir
as páginas novas. Não acionar o workflow geral até resolver essa sincronização.
O aplicativo Meta não foi publicado nem teve permissões ampliadas nesta etapa.
