# Tratamento de dados: fatos e confirmações pendentes

## Fatos disponíveis para preencher sem suposições

- Portfólio proprietário verificado: Xtrategy Digital Marketing.
- Razão social localizada no documento empresarial compartilhado em Carimbo
  Xtrategy: XTRATEGY DIGITAL MARKETING (FZE), Sharjah, Emirados Árabes Unidos.
  O responsável confirmou empresa nos Emirados em 17/11; razão social e país
  preenchidos no rascunho Meta, sem envio final. Não confundir com o país do
  antigo desenvolvedor. O documento financeiro não será anexado à revisão.
- Contatos públicos: privacidade@sistemazapchat.com e contato@sistemazapchat.com.
- E-mail do responsável citado nas páginas existentes: bertramvictor8@gmail.com.
- Cloudflare intermedeia HTTPS/OAuth/webhook do piloto; desde 16/11 os dados
  persistem em banco exclusivo no Droplet SistemaZapChat existente na DigitalOcean,
  região nyc1. O piloto hospedado não depende do computador do proprietário.
  Postgres/Redis são componentes desse ambiente, não operadores jurídicos
  independentes por serem softwares. A Meta fornece autenticação e dados da plataforma.
- O serviço do piloto cifra tokens com AES-256-GCM; não declarar que todos os
  textos das conversas estejam cifrados em repouso por essa mesma implementação.
- Não há encaminhamento de Directs a fornecedores de IA neste escopo.
- O backup do banco do piloto é cifrado com AES-GCM; sua restauração foi testada
  e uma cópia cifrada foi verificada fora do servidor. Isso não é uma declaração
  de que o banco inteiro do CRM principal esteja cifrado ou tenha backup validado.
- Responsável e avaliador usam empresas distintas no piloto. O avaliador não
  lista a conexão do responsável nem lê suas conversas. Credenciais de avaliação
  só devem ser entregues nos campos privados da análise, quando o pacote estiver apto.
- O procedimento de exclusão existente exige validação do solicitante e conferência
  de histórico/cópias. Desconectar não equivale a apagar ou revogar na Meta.

Razões sociais de fornecedores devem ser as entidades contratuais aplicáveis,
não inferidas automaticamente do nome comercial. Atualizar o formulário para a
topologia efetiva acima antes da submissão; não reutilizar a descrição antiga de
armazenamento somente local. Conferir o cadastro legal do proprietário na Meta,
sem substituir a identidade do controlador pelo e-mail do antigo desenvolvedor.

## Declarações e estado de preenchimento

| Pergunta Meta | Resultado da busca | Ação necessária |
| --- | --- | --- |
| Pessoa/entidade controladora | XTRATEGY DIGITAL MARKETING (FZE), documento empresarial e contexto do responsável | Preenchido no rascunho em 17/11; revisar antes do envio |
| País do controlador | Emirados Árabes Unidos, Sharjah; documento e confirmação do responsável | Preenchido no rascunho em 17/11 |
| Entrega por segurança nacional nos últimos 12 meses | Responsável confirmou em 17/11 que não houve entrega | Resposta “Não” salva no rascunho; confirmação do responsável, não inferência do Git |
| Processos aplicados a pedidos de autoridades | Responsável confirmou em 17/11 que ainda não estão formalizados | Nenhuma das opções acima salva no rascunho; minuta abaixo segue não adotada |

## Procedimento proposto, ainda não adotado nem declarado à Meta

Esta minuta pode servir de base para uma política interna. **Não representa
afirmação de que o processo já existe ou foi aplicado nos últimos 12 meses.**

1. Centralizar a solicitação no responsável pelo tratamento e registrar origem,
   data, base alegada, escopo e prazo. Preservar apenas os dados necessários.
2. Validar autenticidade e competência do solicitante e encaminhar a análise
   jurídica antes de decidir divulgação, ressalvadas obrigações legais aplicáveis.
3. Avaliar contestação ou esclarecimento para pedidos inválidos, excessivos ou
   incompatíveis com a legislação, com orientação jurídica.
4. Se cabível divulgar, limitar a resposta ao mínimo exigido, por canal seguro.
   Não disponibilizar credenciais ou acesso amplo ao CRM como resposta padrão.
5. Registrar decisão, fundamento, dados fornecidos e responsáveis, com acesso
   restrito e retenção apropriada. Avaliar comunicações permitidas aos envolvidos.

A adoção/revisão dessa minuta cabe ao responsável. Só marcar no formulário os
processos que ele confirmar como efetivamente implementados. Não é necessário
enviar documentos pessoais ou pedidos confidenciais no chat para responder.

## Operadores: cadastro concluído no rascunho em 18/11

DigitalOcean, LLC e Cloudflare, Inc. salvos como serviços de TI/nuvem. A etapa
Tratamento de dados passou a 100%. O detalhe e os limites estão em
[preparação de 18/11](PREPARATION-2026-11-18.md).

A Meta exige países de processamento e acesso remoto de cada operador. A região
nyc1 confirma armazenamento nos EUA, mas não limita por si os acessos de suporte.
Não preencher só EUA ou todos os países por suposição. Conferir a lista aplicável
ao serviço e à contratação antes de concluir esse cadastro.

- [DigitalOcean: termos](https://www.digitalocean.com/legal/terms-of-service-agreement)
  identificam DigitalOcean, LLC como parte contratante.
- [DigitalOcean: subprocessadores](https://www.digitalocean.com/trust/subprocessors).
- [Cloudflare: subprocessadores](https://www.cloudflare.com/gdpr/subprocessors/cloudflare-services/).

Fontes consultadas em 17/11/2026; não tratá-las como lista de serviços usados
pelo piloto. Só declarar fornecedores que efetivamente recebem esses dados.
