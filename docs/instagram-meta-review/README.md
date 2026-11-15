# Pacote de preparação da análise Meta

Aplicativo **ZapChat Social Lab** — 1684815669905187. Rascunho **1690021079384646**.
Preparado em 14/11/2026. **Não enviado e ainda não apto à submissão.**

**Estado mais recente:** [acesso externo e OAuth de 15/11](../INSTAGRAM-REVIEW-EXTERNAL-2026-11-15.md).
Website e callback do avaliador publicados e salvos na Meta; OAuth real concluído
e conexão temporária do proprietário removida somente dessa cópia. O vídeo final,
o webhook do avaliador e a hospedagem contínua ainda não estão concluídos.
**Repetição posterior do OAuth falhou:** troca de código200 e identidade empresarial
403/Graph code4. Não considerar a conexão repetível validada. Original do laboratório
responde200; CI de0f03417 passou. Detalhes no registro externo acima.

**Atualização de 15/11:** cancelamentos implementados e validados; instância local
independente do avaliador criada, sem tokens Meta, com dados fictícios. Prévia
gravada em `assets/reviewer-demo-20261115.mp4`. Ver
[entrega técnica](../INSTAGRAM-REVIEW-TECHNICAL-2026-11-15.md) para testes e limites.
Isso não conclui Website externo, OAuth real ou vídeo final da análise Meta.

## Material preparado

- [Evidências do CRM principal e ChatbotX](EVIDENCE.md): fontes com revisões fixadas,
  fatos reutilizáveis e limites do que cada fonte demonstra.
- [Justificativas e instruções do avaliador](REVIEWER-GUIDE.md): textos em inglês
  para o formulário, restritos à função efetiva do piloto.
- [Roteiro e pendências técnicas](DEMONSTRATION.md): etapas para a gravação e
  critérios para não apresentar uma simulação como entrega real.
- [Respostas sobre dados e decisões pendentes](DATA-HANDLING.md): dados encontrados,
  campos sem fonte e procedimento proposto para adoção pelo responsável.
- `assets/zapchat-icon-transparent-1024.png`: ícone com transparência, no tamanho
  exigido, baseado no símbolo existente no favicon do CRM. A versão JPEG com
  fundo branco foi recusada pela Meta; não usar essa versão na submissão.

Permissões limitadas a **instagram_basic** e **instagram_manage_messages**.
Nenhuma permissão de anúncio, publicação, comentários ou Human Agent solicitada.
Solicitar a permissão não comprova seu uso integral nem assegura aprovação.

## Dados existentes reaproveitados

| Campo | Valor e limite |
| --- | --- |
| Produto | SistemaZapChat; aplicativo isolado ZapChat Social Lab |
| Portfólio proprietário do app | Xtrategy Digital Marketing, verificado na Meta |
| Política | https://sistemazapchat.com/privacy |
| Exclusão | https://sistemazapchat.com/data-deletion |
| Termos existentes | https://sistemazapchat.com/terms; descrição antiga de WhatsApp, não prova publicação do Instagram |
| Privacidade | privacidade@sistemazapchat.com; entrega da caixa não auditada |
| Contato existente | contato@sistemazapchat.com |
| Responsável citado no CRM | bertramvictor8@gmail.com; e-mail não informa nome legal nem país |
| Contato do desenvolvedor na Meta | joaobosco_382@hotmail.com; mantido como cadastrado |
| Categoria | Negócio e Páginas |

## O que ainda depende do responsável

1. Nome legal e país de quem controla os dados deste app. O cadastro do portfólio
   Xtrategy existe, mas a consulta de detalhes pediu autenticação de dois fatores.
   O responsável pode concluir isso diretamente na Meta para permitir a leitura;
   não deve enviar códigos, senha, documento ou token pelo chat. Se o controlador
   for diferente da empresa do portfólio, é preciso informar essa diferença.
2. Histórico real de fornecimento de dados a autoridades por segurança nacional
   nos últimos 12 meses e quais processos já são adotados. Não há essa informação
   no código, nas páginas legais nem nas notas do projeto. Não marcar Não ou
   declarar processos existentes por ausência de um registro no GitHub.
3. O acesso externo separado foi autorizado e preparado. Verificar a disponibilidade
   contínua e manter a cópia sem tokens/conversas do proprietário antes de fornecer
   sua credencial exclusiva nos campos privados da análise.
4. Revisar as concordâncias e o envio final quando o pacote estiver completo.
   Nenhuma concordância ou declaração foi aceita em nome do responsável.

**Não é necessário pedir novas mensagens ao usuário nesta preparação.** A gravação,
o ambiente externo e os ajustes técnicos de demonstração são tarefas do projeto,
não solicitações para o usuário repetir os testes anteriores.

## Limites de publicação

Não substituir o URL de acesso do avaliador pelo CRM de produção: o módulo
Instagram não está publicado ali. O hostname instagram-lab.sistemazapchat.com
atualmente expõe apenas callback/webhook; não é um endereço de painel disponível
para login. Não cadastrar esse hostname como Website funcional antes de preparar
e verificar um serviço externo autenticado de avaliação.

Não enviar vídeos com credenciais, códigos OAuth, tokens, mensagens ou nomes de
clientes. Nenhuma conversa real foi exportada para este pacote. Não alterar o CRM
principal, seus termos ou sua infraestrutura para preencher lacunas da revisão.
