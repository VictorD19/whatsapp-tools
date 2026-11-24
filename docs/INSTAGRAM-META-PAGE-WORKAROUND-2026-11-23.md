# Preparação da correção indicada pela Meta — 23/11/2026

O suporte respondeu no chamado2256928134873004: o Instagram está vinculado a
uma Página e o token atual não inclui esse ativo. Informou um problema conhecido
e orientou usar uma configuração de usuário do sistema com Instagram e Páginas,
instagram_basic + instagram_manage_messages + pages_show_list, selecionando os
dois ativos na reconexão. É uma orientação do suporte, ainda não uma correção
comprovada por recebimento real no nosso piloto.
Fonte: https://developers.facebook.com/support/bugs/2256928134873004/ .

## O que foi preparado

O proprietário confirmou adicionar pages_show_list e criar a nova configuração.
A permissão apareceu como Pronto para teste. Configuração criada:

- Nome: ZapChat Piloto IG e Pagina.
- ID:2759508501174736; aplicativo1684815669905187.
- Usuário do sistema, validade de60dias.
- Páginas e contas do Instagram obrigatórias; nenhum outro tipo de ativo.
- Exatamente instagram_basic, instagram_manage_messages e pages_show_list.
- Configuração original1680712757031270 preservada.

Criar essa configuração não concedeu acesso a uma Página ou renovou tokens.
A reconexão e a confirmação de acesso ao ativo continuam pendentes.

## Código e pacote

Commit13a1d4a na branch do piloto acrescenta INSTAGRAM_FACEBOOK_CONFIG_ID opcional.
Somente Continuar com Facebook usa esse ID; a entrada atual do Instagram mantém
o ID original. Configurações malformadas são recusadas, sem acrescentar scopes
na URL nem expor segredos. O bootstrap aceita meta.facebookConfigId e o diagnóstico
local valida o mesmo campo. A interface explica a seleção da Página vinculada.

102 testes Instagram e5 de configuração passaram sem chamadas Meta. A imagem
Linux amd64 shared-20261123-r7 compilou. Em contêiner sem rede externa, login,
página Instagram e scripts abriram; o adaptador compilado escolheu os dois IDs
corretamente. Não confundir esse teste de empacotamento com webhook real.

R7 ainda não transferida ou publicada. O procedimento preparado exige restauração
de novo backup antes da troca, preserva os seis serviços principais, verifica
isolamento e as duas configurações de login sem visitar Meta e cria snapshot
privado da configuração para restaurar a R6 em caso de falha. Envios desligados.

## Estado comprovado e próximos passos

Em21/11, o convite agenciainstapush foi aceito. Um único Direct autorizado existiu
na Meta às18:32UTC, mas não chegou ao piloto; não foi respondido pelo CRM nem
importado para simular webhook. O chamado foi reaberto e recebeu a orientação
nova acima. O controle temporário de respostas foi desligado no mesmo dia.

A R6 continua sendo a última versão publicada. As11 verificações externas em
23/11 passaram, incluindo bloqueios de envio/histórico e assinatura do receptor.
A comparação dos seis processos principais foi feita em21/11; não se afirma
uma nova inspeção administrativa em23/11. A janela anterior de12horas encerrou.

Falta autorizar nova janela administrativa para aplicar R7; renovar a conexão
pelo botão Facebook com @joaobosco.pro e somente a Página vinculada; conferir
token e ativos; e obter autorização específica antes de qualquer novo envio.
O único envio anteriormente autorizado já foi usado. Não pedir Directs manuais.

A análise Meta permanece rascunho. Depois de validar a entrega real, concluir a
gravação/reprodução do avaliador e incluir a justificativa/Advanced Access da
nova permissão pages_show_list, além das permissões de Instagram. Não fornecer
senhas pessoais ou declarar o vídeo completo antes de existir essa evidência.
