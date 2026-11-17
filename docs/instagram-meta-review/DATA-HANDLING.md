# Tratamento de dados: fatos e confirmações pendentes

## Fatos disponíveis para preencher sem suposições

- Portfólio proprietário verificado: Xtrategy Digital Marketing.
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
