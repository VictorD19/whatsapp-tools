# Recuperação OAuth e hospedagem isolada — 15/11/2026

> **Decisão substituída em 16/11/2026:** o usuário recusou novo servidor,
> plano ou aumento contratado para o piloto. A proposta de custo e a sequência
> de provisionamento abaixo são apenas histórico; não devem ser executadas.
> O destino é um ambiente isolado no servidor SistemaZapChat existente e,
> após validação e aprovações, a incorporação ao CRM principal.
> Consulte [escopo vigente](INSTAGRAM-PILOT-INTEGRATION-SCOPE-2026-11-16.md).
> **Instalação concluída em 16/11:** [entrega no servidor existente](INSTAGRAM-SHARED-SERVER-DEPLOYMENT-2026-11-16.md).
> O endereço público e o webhook estão no servidor; o acesso administrativo
> temporário já foi removido. O Direct real continua pendente de validação.

## Estado desta entrega

75 testes Jest passaram. Build API, Web externa e imagem Docker exclusiva passaram.
Verificação posterior elevou o total para77 testes, incluindo HTTP202 com UTF-8,
cache desabilitado e ausência de códigos/erros privados no callback. CI43710462996
concluiu Tests e Docker Build com sucesso parae58ecb0. Os dois testes adicionais
não mudam o código de execução já validado nesse commit.
O login Facebook pela sessão existente concluiu uma nova autorização real de
@joaobosco.pro no endereço do avaliador. Nenhuma senha nova solicitada nesta
autorização, anúncio selecionado, conversa importada ou mensagem enviada.
Isso confirma conexão OAuth, não recebimento real de Direct por webhook.
[Captura da conta reconectada](instagram-meta-review/assets/reviewer-reconnected-20261115.jpg).
O screencast não registrou o percurso completo; esta captura não é apresentada
como gravação final de análise. Nenhuma credencial da cópia foi compartilhada.

## Correção do tratamento da recusa Meta

Antes, um erro após a troca do código descartava o token e exigia novo OAuth.
Agora o código de uso único é trocado uma vez, e o token é criptografado com
AES-GCM antes de ficar temporariamente no Redis exclusivo do piloto. A fila
contém somente os identificadores de empresa/administrador, nunca token ou código.

Erros transitórios e de limite, incluindo Graph code4, são separados de recusa
permanente de permissão. Retry-After é respeitado; a espera começa em cinco
minutos e aumenta até30min, com máximo de cinco tentativas e validade total de
uma hora. A mesma autorização é retomada pelo servidor a cada30s de verificação
da fila, sem chamadas adicionais antes do horário devido e sem depender da aba.
Não são enviadas mensagens nem consultadas conversas por esse processo.

Gravação inicial e reagendamento são atômicos no Redis. Locks delimitados por
empresa e usuário evitam conclusão concorrente; cancelamento usa o mesmo lock.
Token temporário é retirado em sucesso, expiração, recusa permanente, cancelamento
ou troca do aplicativo. Administrador e empresa são revalidados antes de concluir;
remoção/rebaixamento impede conexão posterior. Um token com erro durante a própria
troca de código não é inventado ou reutilizado.

Rotas autenticadas: GET instagram/connection, POST instagram/connection/retry e
DELETE instagram/connection. O callback público não retorna tokens, códigos ou
erros brutos do provedor; uma autorização em espera retorna202 e instrução clara.
Um segundo OAuth não é iniciado enquanto houver autorização pendente. A interface
acompanha a pendência, permite cancelar e oferece Continuar com Facebook usando
a sessão existente. O botão original preserva as opções Facebook/Instagram.

O piloto publicado neste computador recebeu somente as novas cópias API/Web e o
gateway do avaliador, com backup do build anterior. Nenhuma migração no CRM principal.
O recebimento de Directs de usuários comuns ainda depende de Advanced Access.

## Verificação prática

- 75 testes em seis suítes: quota/permissão, espera, expiração, isolamento,
  retomada após recriar o gerenciador, cancelamento, concorrência e administrador.
- Redis real, em DB15 inicialmente vazia do avaliador: Lua/TTL/fila/lock passaram;
  uma troca de código, retomada após recriar o gerenciador, zero chamadas Meta.
- Nova autorização real concluiu no navegador e exibiu @joaobosco.pro no piloto.
  Nesse ensaio, a Meta respondeu com sucesso, sem exigir retomada diferida. Não
  alegar que houve uma recuperação real de quota em produção; o caminho de erro
  foi validado com fixtures e Redis real.
- Novo pacote Linux executou API mínima, Web standalone, gateway, Postgres e
  Redis; todos saudáveis. Login e bloqueios de cadastro, resposta real e importação
  passaram. Reinício preservou banco e login. Nenhuma credencial de WhatsApp,
  Google ou IA carregada; AppModule completo não é iniciado.
- Backup AES-GCM do banco fictício criado, descriptografado e restaurado em uma
  base temporária separada. Um usuário restaurado, base temporária retirada.

## Pacote de hospedagem pronto para provisionamento

Arquivos em infra/instagram-host: Dockerfile, compose.yml, bootstrap.cjs,
start.cjs, install.sh e backup.py. Preparação privada em
tools/instagram-host-prepare.mjs; recusa sobrescrever credenciais existentes.
Nada dessa pasta privada é incluído no Git ou no contexto Docker.

O supervisor lê o segredo restrito e abandona root antes de iniciar os servidores.
API e Web só atendem internamente ao gateway. Banco e Redis não têm portas
públicas. O gateway atende somente rotas de avaliação e fica no host em loopback;
HTTPS chega por um túnel Cloudflare novo e exclusivo, ainda não criado. Reinício
de processo encerra o conjunto e a política do Docker o inicia novamente. Segredos
JWT, criptografia, banco e login são exclusivos. Imagem é identificada por commit.
O uso de NODE_ENV=test é exclusivo deste bootstrap mínimo, mantendo intacto o
bloqueio do módulo na configuração de produção do CRM.

Na validação em macOS, a montagem de arquivos privados ficou aguardando. O ensaio
usou um volume privado preenchido diretamente pelo Docker, sem alterar permissões
de pastas do computador. Esse override é privado e não integra a instalação Linux.

## Proposta concreta de servidor — requer aprovação de custo

Consulta MCP de15/11 confirmou:

| Item | Proposta |
| --- | --- |
| Nome | zapchat-instagram-pilot |
| Região | nyc3, disponível; separada da região nyc1 do CRM principal |
| Plano | s-2vcpu-4gb:2vCPU,4GB RAM,80GB disco |
| Valor do servidor | US$24/mês, antes de impostos |
| Sistema | Ubuntu24.04LTS x64, imagem252242095, disponível em nyc3 |
| Backup | semanal básico:20%, US$4,80/mês; confirmar política após criar |
| Total previsto | US$28,80/mês antes de impostos; nenhum custo contratado nesta preparação |
| Administração | chave SSH exclusiva do piloto, privada neste computador |

Referência de preço de backup:
https://docs.digitalocean.com/products/backups/details/pricing/.
A capacidade é proposta para o piloto de avaliação, não dimensionamento de50
clientes em produção. Não alterar tamanho, imagem, firewall ou backups do
Droplet SistemaZapChat557124676.

## Sequência após aprovação

1. Registrar somente a nova chave pública e criar somente o novo Droplet; conferir
   ID, nome, região, plano e política de backup. Guardar recibos sem segredos.
2. Enviar release imutável e configurações exclusivas ao novo servidor, por SSH.
   install.sh recusa o ID da produção, hostname diferente ou identidade de
   metadados diferente. Instala Docker e inicia somente o compose do piloto;
   valida login, restrições e restauração antes de expor o site.
3. Criar túnel Cloudflare exclusivo. Não reutilizar o token/conector do túnel
   original. Mover somente instagram-review para o novo túnel após a saúde passar;
   guardar destino DNS anterior para retorno. Nenhum registro do domínio principal
   ou do hostname instagram-lab é alterado nesta troca.
4. Conectar a conta de teste no novo serviço. Configurar e verificar o webhook do
   app de testes para o novo receptor somente após validar o endereço. Preservar
   o endereço anterior para retorno. Não alegar webhook real com base em um
   evento sintético, nem pedir novas mensagens ao usuário.
5. Antes de entregar credencial à Meta, preparar tenant de avaliação sem token ou
   conversas do proprietário. Concluir vídeo real e declarações verificadas;
   Advanced Access e publicação futura no CRM principal são liberações separadas.

Uma reinstalação não pode trocar chaves de criptografia silenciosamente. Antes de
qualquer atualização: backup lógico com restauração verificada, release anterior
preservada e avaliação de compatibilidade de migrações. Não rodar install.sh em
upgrade: ele recusa uma instalação existente. Retorno do DNS e do webhook deve
preservar mudanças posteriores; não restaurar configurações inteiras às cegas.
