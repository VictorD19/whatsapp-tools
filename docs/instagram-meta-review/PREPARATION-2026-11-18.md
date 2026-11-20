Atualização em 20/11: R4 publicada e validada no piloto; este registro mantém a
preparação histórica. Consulte o
[estado publicado](../INSTAGRAM-PILOT-R4-PUBLISHED-2026-11-20.md).

# Cadastro e gravações — 18/11/2026

Estado: preparação avançou; pedido 1690021079384646 não enviado e ainda não apto
à submissão de caixa de entrada para outras empresas. CRM principal preservado.

## Concluído

- DigitalOcean, LLC cadastrada como serviços de TI/nuvem nos EUA: Droplet nyc1
  e locais dos serviços aplicáveis publicados pelo provedor.
- Cloudflare, Inc. cadastrada como serviços de TI: cobertura geográfica publicada
  da rede regular e suporte, com 134 países/territórios. Sem declarar passagem
  de tráfego por todos eles. China Network excluída por ser serviço separado;
  Liechtenstein e Malta incluídos na abrangência EEA publicada para suporte.
- Etapa Tratamento de dados validou 100% no painel. Não ampliar isso para uma
  declaração de conformidade integral do produto com a revisão de mensagens.
- Fluxo real do piloto hospedado: login do serviço pausado durante credenciais,
  seleção apenas de Joao Bosco/@joaobosco.pro, revisão Meta de perfil/Direct,
  confirmação do provedor e callback bem-sucedido. Sem selecionar anúncios,
  enviar mensagens ou importar histórico no servidor. A mesma conexão existente
  foi renovada; não foi concedida nova conta ao tenant do avaliador.
- Mensagem original Teste ZapChat 15 revalidada por leitura na Meta: HTTP200,
  texto/remetente conferidos, sem envio. Gravação suplementar da cópia local
  identifica histórico e não comprova webhook real. Identificador do remetente
  ocultado no vídeo. Sem uso de mensagens de clientes ou menus de outros ativos.
- Vídeos reais exportados, legendas em inglês, sem áudio, H.264/1280x840; frames
  decodificados conferidos. Pausas privadas omitidas; não representam captura
  contínua do desktop. Arquivos em output/instagram-meta-review-20261118, fora do Git.
- Justificativas de instagram_basic e instagram_manage_messages salvas no
  rascunho com os limites explícitos. Testes API de instagram_basic: Concluída
  no painel. Na preparação automática, concordâncias de uso permitido não foram marcadas; senha do avaliador não
  transmitida. Nenhuma aceitação de termos ou envio final executado.

## Upload: resolvido para instagram_basic

Após envio manual pelo Chrome, reabrir o mesmo pedido na sessão do avaliador
confirmou o link “Visualizar screencast carregado” em instagram_basic, associado
ao vídeo 3013972138947842. O anexo persistiu; a falha de transporte anterior não
impede mais esse vídeo. Não concluir que todos os anexos foram enviados.
A concordância de instagram_basic apareceu marcada após a ação manual do usuário;
o agente não a marcou nem enviou a análise. Evidência visual local preservada
em output/instagram-meta-review-20261118/meta-video-saved-20261118.png.

### Falhas anteriores, preservadas como diagnóstico

A interface chegou a 100% de transferência, mas o POST ao serviço rupload da Meta
retornou HTTP400, NotAuthorizedError, User not authorized to perform this request,
com retriable=false. Reabrir a justificativa confirmou ausência do anexo; não
considerar vídeo anexado apenas pela barra em 100%. A sessão mostra Joao Bosco
como Administrador do app; não foi comprovado que falte essa função. Não alterar
funções, permissões ou cookies para contornar. As tentativas automáticas foram
interrompidas recarregando o painel. Vídeos locais e diagnóstico preservados.
Um ZIP com as mesmas gravações foi tentado pelo controle oficial de documentação
de apoio; a barra também chegou a 100%, mas o anexo não permaneceu após
recarregar/reabrir. Não considerar esse pacote anexado. Não houve mudança de
funções, cookies, permissões ou tentativa de contornar a autorização do serviço.

## Critério oficial que impede chamar o pacote de pronto

A página específica para apps de outras empresas exige demonstração na mesma
versão submetida: iniciar conversa, receber, responder, excluir e tratar mensagens
com envio cancelado. O trecho foi conferido também em inglês. Fonte:
https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-other-businesses .

A autorização foi demonstrada. A leitura histórica suplementar está em outra
cópia e não substitui esse fluxo. No hospedado, respostas/importação estão
bloqueadas e não há recebimento real por webhook confirmado. Exclusão pelo
operador foi implementada e verificada localmente, mas ainda não publicada nem
demonstrada no ambiente hospedado. O tratamento de
cancelamento foi implementado/testado em etapas anteriores, mas ainda falta
sua demonstração no fluxo real submetido. Não marcar conformidade nem enviar
como se esses pontos estivessem validados.

Nenhuma nova mensagem foi pedida ao responsável. O trabalho com evidência
histórica preserva essa restrição, mas não cria prova de uma resposta real atual.

## Ajuste do retorno OAuth preparado

O piloto usa navegação na mesma aba, mas o callback atual devolve texto pedindo
fechar a janela. A gravação mostra o retorno manual ao endereço do painel. Na
branch, o gateway exclusivo do avaliador agora prepara HTTP303 para
/instagram#conexao somente após sucesso200 do callback. Destino fixo e mesma
origem, sem code/state/return URL. HTTP202 e falhas preservados, envio/importação
continuam bloqueados. Cinco testes HTTP passaram. Ainda não publicado no servidor;
a chave administrativa segue removida. Nenhum código do CRM principal foi
publicado, e seus serviços não foram reiniciados.

## Fontes dos provedores

- https://www.digitalocean.com/legal/data-processing-agreement
- https://www.digitalocean.com/trust/subprocessors
- https://www.cloudflare.com/terms/
- https://www.cloudflare.com/network/
- https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/
- https://developers.cloudflare.com/china-network/

O detalhe dos países e os recibos ficam nos registros locais privados. Não
copiar tokens, credenciais, respostas brutas de OAuth ou o documento financeiro
para a revisão. Só entregar a credencial do tenant exclusivo de avaliação no
campo privado da Meta, quando o percurso estiver pronto e a entrega autorizada.

## Encerramento da preparação local

API, Web e gateway locais de avaliação usados nas gravações foram encerrados
após conferir PID/caminho. Bases e frames originais preservados. O piloto público
continua no servidor existente; acesso administrativo não foi reativado. Código
do retorno seguro salvo na branch de testes em 53ec43e, PR118 em rascunho.
Conferência HTTP local: cinco testes aprovados; não foi feita nova implantação.

## Exclusão pelo operador — preparada na branch, não publicada

- DELETE autenticado e limitado ao administrador, tenant, conta ativa e modo do
  piloto. Remove texto e mantém somente registro vazio com IDs para impedir
  restauração por reentrega/histórico e duplicação de envios. Não apaga no Instagram.
- Envios pendentes/sem confirmação preservados para reconciliação.
- Interface solicita confirmação; cancelar mantém o conteúdo. Leituras antigas
  em andamento são invalidadas para não reexibir o texto removido.
- 82 testes Instagram passaram, API e Web de avaliação compilaram; cinco testes
  HTTP do gateway passaram. PostgreSQL verificou exclusão/cancelamento, repetição,
  histórico, isolamento e preservação de envios incertos, com rollback total.
- Verificação no navegador com conta/mensagens fictícias: cancelar, excluir,
  simular cancelamento e recarregar. Conteúdo permaneceu removido. Nenhuma
  chamada Meta, mensagem real excluída ou acesso ao servidor principal.
- HTTP local: sem autenticação 401, agente 403, outro tenant habilitado 404,
  repetição pelo administrador 200; textos excluído/cancelado vazios no retorno.
- Esse QA não é demonstração de mensagens reais para a Meta. A liberação do
  fluxo de resposta e sua demonstração hospedada continuam pendentes.

Os processos locais deste QA foram encerrados e somente os dois tenants/usuários
fictícios criados para ele foram removidos. Recibos e capturas privados preservados.
