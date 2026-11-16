# Piloto instalado no servidor existente — 16/11/2026

## Entrega e limites

O piloto está instalado no Droplet SistemaZapChat 557124676, sem contratação,
alteração de plano, alteração das configurações ou reinício dos serviços do CRM
principal. Endereço: https://instagram-review.sistemazapchat.com/instagram.
O webhook do aplicativo Meta 1684815669905187 está ativo em
https://instagram-review.sistemazapchat.com/api/v1/instagram/webhook,
com os mesmos campos `messages` e `standby`, Graph v27.0. Os demais objetos de
assinatura foram preservados. Não confundir confirmação do endpoint com Direct
real: nenhum Direct real por webhook foi comprovado nesta entrega.

As sete abas estão disponíveis. Automações, Assistente IA, Menus do Direct,
Resultados e Laboratório continuam prévias interativas; não foram transformadas
em integrações reais por esta instalação. Envios reais e IA permanecem desligados.
A análise de acesso avançado Meta, as declarações factuais e a gravação real
ainda precisam ser concluídas. Não foi solicitada nova mensagem de teste.

## Instalação isolada

- Projeto Docker: `zapchat-instagram-lab`. Caminho: `/opt/zapchat-instagram-lab`.
- Release atual: `shared-20261116-r2`; symlink `current` aponta para essa pasta.
- Imagem Linux amd64: `zapchat-instagram-pilot:shared-20261116-r2`, construída
  neste computador, não no servidor. SHA-256 do pacote transferido:
  `80dcce7c953c8345810e16948367f42ebaeabce178f8240948ad6e812d0bf43e`.
- Aplicação, Postgres, Redis e túnel exclusivos. Sem portas publicadas no host,
  volumes ou redes de produção. Teto agregado: 1 GiB RAM e 0,65 CPU. Logs limitados.
- Segredos de banco, JWT, criptografia e acessos exclusivos. A conexão autorizada
  de @joaobosco.pro foi validada na Meta e recriptografada para a chave do servidor.
  Nenhuma conversa foi copiada. Token sem expiração declarada foi tratado como tal;
  sua validade foi confirmada, não inferida apenas da ausência de data.
- Login do responsável: `instagram-review@example.com`, tenant `instagram-review`.
  Login do avaliador: `meta-review@example.com`, tenant `instagram-meta-review`.
  O segundo não é superadministrador e não enxerga a conta do primeiro. Senhas
  somente nos arquivos privados, nunca nesta documentação ou no Git.
- Os arquivos privados ficam em diretório 0700. Credencial do túnel root:65532,
  modo 0640, para o usuário não privilegiado oficial do cloudflared. Não executar
  o conector como root para contornar a leitura do arquivo. Procedimento em
  `infra/instagram-host/start-shared-tunnel.sh`.

## Continuidade e encaminhamento

Túnel exclusivo Cloudflare `7800658f-df3e-4f70-afaa-27758d2bca73`, saudável com
quatro conexões. Somente o CNAME `instagram-review.sistemazapchat.com` mudou.
O domínio principal e a configuração do túnel legado não foram alterados.
O serviço usa `restart: unless-stopped`; Docker já estava habilitado no boot.
Somente a aplicação do piloto foi reiniciada para comprovar persistência.

As antigas API, Web e gateway do avaliador neste computador foram encerradas
após conferência de PID, caminho e comando. O endereço público e a conexão
continuaram funcionando. A base local foi preservada para reversão. O laboratório
legado original não é o receptor Meta atual; sua consulta periódica não representa
recepção em tempo real pelo novo piloto. Nenhuma nova tarefa de polling foi
instalada no servidor. O receptor funciona sem aba ou computador do proprietário.

## Evidências

1. Onze verificações HTTPS passaram antes e depois de encerrar os processos
   locais: login, autenticação obrigatória, conta autorizada presente, envio
   desligado, bloqueios de cadastro/resposta/importação/origem estrangeira,
   desafio de webhook, evento vazio assinado e rejeição de evento sem assinatura.
2. O evento assinado é sintético e vazio; não foi injetado como mensagem real.
   A confirmação da assinatura pela Meta também executou o desafio do endpoint.
3. Isolamento local testado com duas empresas e conversa fictícia: o dono lê a
   mensagem, o avaliador não lista a conta/conversa nem lê as mensagens. Oito
   verificações passaram. No servidor, seis verificações passaram, com a conta
   real do proprietário e sem conversas importadas. Listagem de outra conta
   retorna lista vazia; leitura de conversa de outra empresa é recusada.
4. Backup AES-GCM final restaurado em base temporária distinta: dois usuários
   recuperados. Arquivo `instagram-20261116T130241Z.dump.aesgcm` copiado para fora
   do servidor. Não é backup ou validação de restauração do CRM principal.
5. Comparação antes/depois dos seis serviços `wt-*`: mesmos IDs e horários de
   início, todos em execução. Nenhuma migração foi executada na base principal.
6. Memória disponível observada após instalar: aproximadamente 1.680 MiB; swap
   em uso 698 MiB. Trata-se de observação pontual, não dimensionamento de 50
   clientes ou ensaio de carga. Imagens r1/r2 foram mantidas para reversão; os
   dois arquivos de transferência foram removidos para recuperar espaço.

Registros privados em `.instagram-test/shared-host`, incluindo testes, hashes,
recibos e backup. Os 77 testes Jest da etapa anterior também passaram. Esta
revisão de bootstrap foi verificada em execução local e no servidor.

O acesso SSH temporário foi removido às 13:05 UTC (17:05 Dubai) de 16/11.
Uma entrada retirada, demais entradas preservadas; uma nova autenticação com
a chave do piloto foi recusada. O piloto continuou acessível sem esse acesso.
Backup final fora do servidor: SHA-256
`392afe931e1cb86506e7ba559bac20a798f3b80e74c0515a3720d79ddef2c811`.
Após remover somente os pacotes temporários transferidos, aproximadamente
13 GiB de disco estavam livres (84% de uso).

## Operação e reversão

Não usar `infra/instagram-host/install.sh` neste servidor: é o instalador antigo
para outro host e altera pacotes/firewall. `install-shared.sh` serve apenas à
instalação inicial e recusa volumes/instalação existentes.

Para parar o piloto, usar somente o projeto `zapchat-instagram-lab`, seu arquivo
Compose e seus segredos; não usar `down -v`, comandos de limpeza global ou o
Compose do principal. Não excluir os volumes. A imagem r1 e o arquivo privado
`runtime-before-reviewer.json` permitem reverter somente o bootstrap do piloto;
isso desabilita o acesso da empresa exclusiva do avaliador até nova revisão.

O CNAME anterior do avaliador era
`f3ccf046-8d29-4be7-bf89-738c982ba225.cfargotunnel.com`. Retornar a ele exige antes
religar a API/Web/gateway locais; não apontar de volta para processos desligados.
Reverter o webhook Meta também exige confirmar receptor antigo e verify token.
Não alterar domínio ou serviços do CRM principal nesses procedimentos.

Para a submissão Meta, fornecer somente o acesso `meta-review@example.com` nos
campos privados da análise após concluir o pacote. Nunca compartilhar o login
do responsável conectado a @joaobosco.pro. Não inventar nome legal, país ou
histórico de atendimento a solicitações de autoridades.
