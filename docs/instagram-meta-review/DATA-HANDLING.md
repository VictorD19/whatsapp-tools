# Tratamento de dados: fatos e confirmações pendentes

## Fatos disponíveis para preencher sem suposições

- Portfólio proprietário verificado: Xtrategy Digital Marketing.
- Contatos públicos: privacidade@sistemazapchat.com e contato@sistemazapchat.com.
- E-mail do responsável citado nas páginas existentes: bertramvictor8@gmail.com.
- Cloudflare intermedeia HTTPS/OAuth/webhook do piloto; dados persistem no banco
  local separado. Postgres/Redis são componentes locais, não operadores jurídicos
  externos por serem softwares. A Meta fornece autenticação e dados da plataforma.
- O serviço do piloto cifra tokens com AES-256-GCM; não declarar que todos os
  textos das conversas estejam cifrados em repouso por essa mesma implementação.
- Não há encaminhamento de Directs a fornecedores de IA neste escopo.
- O procedimento de exclusão existente exige validação do solicitante e conferência
  de histórico/cópias. Desconectar não equivale a apagar ou revogar na Meta.

Razões sociais de fornecedores devem ser as entidades contratuais aplicáveis,
não inferidas automaticamente do nome comercial. A topologia de uma futura
instância externa precisa ser refletida no formulário antes da submissão.

## Campos que continuam sem comprovação

| Pergunta Meta | Resultado da busca | Ação necessária |
| --- | --- | --- |
| Pessoa/entidade controladora | Apenas nome comercial do portfólio e e-mail do antigo responsável | Consultar cadastro legal após 2FA e confirmar quem controla o novo app |
| País do controlador | Termos invocam lei brasileira; isso não comprova sede | Ler cadastro/confirmar país; não preencher pelo fuso do computador |
| Entrega por segurança nacional nos últimos 12 meses | Nenhum registro localizado | Confirmação factual do responsável; ausência no Git não significa Não |
| Processos aplicados a pedidos de autoridades | Política genérica menciona obrigação legal | Confirmar processos já praticados; não marcar os quatro automaticamente |

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
