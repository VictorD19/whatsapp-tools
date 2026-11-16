# Instagram: piloto para incorporação ao ZapChat — 16/11/2026

## Decisão do responsável

O piloto é uma etapa de desenvolvimento do CRM principal, destinado aos seus
clientes. Não é um produto separado. Não contratar servidor, plano ou aumento
para esta etapa. Usar o servidor SistemaZapChat existente (Droplet 557124676),
com serviços, banco, credenciais e acesso de testes separados dos serviços ativos.
Ainda não executar publicação, migração ou reinício no CRM principal.

## Situação verificada

O endereço do avaliador continua servido por este computador, não pelo Droplet.
O perfil Compose `infra/instagram-host/shared-server.yml` foi preparado, mas
não está instalado no servidor. Ele não publica portas no host, não compartilha
volumes/redes do CRM e limita o conjunto a 1 GiB de memória e 0,65 CPU.
Esses limites precisam ser validados sob execução; não provam capacidade para
20 ou 50 clientes. A imagem de instalação deve ser construída fora do Droplet,
para Linux amd64. Não executar o instalador antigo de servidor novo nesse host.

A inspeção de leitura encontrou 1.934 MiB de memória disponível, 640 MiB de swap
em uso e aproximadamente 15 GiB de disco livre de 77 GiB. É uma observação
pontual, não uma garantia de capacidade. Preservar os seis serviços `wt-*`.
O acesso administrativo temporário anterior foi revogado; nenhum acesso novo
foi ativado nesta preparação. O backup de novembro não comprova recuperação
atual: validar novamente antes da futura publicação principal.

## Sete áreas preservadas

| Área | Estado atual | Necessário antes de liberar aos clientes |
| --- | --- | --- |
| Conversas | Tela ligada à API isolada; entrada real por webhook ainda não comprovada | Recepção durável, deduplicação, cancelamentos, atualização em tempo real, histórico e resposta com as permissões necessárias |
| Conexão | OAuth real de @joaobosco.pro confirmado no piloto | Acesso avançado aprovado e conexão por empresa, renovação e revogação validadas |
| Automações | Prévia interativa com múltiplas regras e dados fictícios | Persistência por empresa, gatilhos reais, conflitos, fila e limites; verificar viabilidade de cada condição na API Meta |
| Assistente IA | Prévia interativa | Selecionar agentes do CRM, isolamento, prioridade humana e prevenção de respostas duplicadas |
| Menus do Direct | Prévia interativa | Persistência e recursos reais suportados pela Meta |
| Resultados | Prévia interativa | Métricas originadas em eventos reais, com definições e tratamento de duplicatas |
| Laboratório de testes | Simulação do percurso | Ensaios seguros e reproduzíveis das integrações e dos bloqueios de envio |

As sete abas estão presentes no endereço do avaliador. As cinco prévias usam
uma cópia isolada do protótipo original, sem acesso à rede ou às credenciais do
CRM. Rascunhos dessas prévias duram somente a sessão. Isso preserva o desenho
funcional; não equivale à implementação das integrações ou automações reais.

## Sequência de entrega

1. Validar o perfil de recursos e a imagem compatível; instalar somente o piloto
   isolado no servidor existente, com reversão própria e sem reiniciar o CRM.
2. Concluir acesso externo do avaliador e gravação verdadeira do fluxo Meta.
   A análise de acesso avançado e declarações factuais continuam pendentes;
   não inventar dados legais ou políticas de atendimento a autoridades.
3. Comprovar webhook real e processamento persistente sem depender da aba ou
   deste computador. Consulta periódica não é conclusão desta etapa. Não pedir
   novas mensagens de teste ao usuário nem enviar Directs reais sem autorização.
4. Implementar e validar as áreas ainda em prévia, reaproveitando os serviços e
   agentes existentes do CRM em vez de criar configurações paralelas para clientes.
5. Validar isolamento entre empresas, capacidade, backup e recuperação; preparar
   liberação gradual e reversão. Publicar no principal apenas após validação.
6. Desenvolver o módulo de e-mail na etapa posterior já combinada.

Não declarar o piloto pronto para clientes apenas porque o login funciona,
o webhook sintético responde HTTP 200 ou as telas aparecem. Exigir evidência
das funções contratadas e dos limites da Meta. Alterações seguem na branch
`codex/instagram-test-2026-11-09`, sem merge ou deploy do principal nesta fase.
