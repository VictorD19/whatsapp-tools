# Demonstração e preparação técnica

## Roteiro de gravação preparado

Gravar a versão efetiva submetida, com interface e instruções consistentes.
Não gravar a tela inteira do computador nem outras abas. Usar contas e conteúdo
de teste autorizados. Ocultar senhas, códigos OAuth, tokens e dados de clientes.

| Trecho | Demonstração | Estado nesta preparação |
| --- | --- | --- |
| 1 | Nome do piloto, isolamento e entrada no CRM | Fluxo existente; falta instância externa do avaliador |
| 2 | Instagram → conexão → autorização mínima da conta profissional | OAuth existente; não renovar autorização só para gravar sem necessidade |
| 3 | Username/estado da conta conectada | Implementado |
| 4 | Recebimento e exibição nas Conversas | Histórico por API disponível; webhook de usuário real ainda não comprovado |
| 5 | Resposta manual, quando fizer parte do escopo submetido | Código existente, envio real desligado; não ativar/enviar nesta preparação |
| 6 | Mensagem cancelada pelo remetente deixa de exibir conteúdo | Lacuna: o parser atual descarta is_deleted sem remover conteúdo já salvo |
| 7 | Exclusão pelo operador conforme funcionalidade declarada | Ferramenta administrativa local existe; não há botão equivalente no inbox do piloto |
| 8 | Desconectar e consultar instruções de exclusão | Fluxos existentes; sem desconectar a conta atual nesta preparação |

**Este arquivo é o roteiro; não existe gravação final comprovando todas as linhas.**
Não produzir montagem com eventos sintéticos como prova de recebimento real.
Não usar o resultado de sincronização de cinco minutos para alegar webhook instantâneo.

## Lacunas técnicas que cabem ao desenvolvimento

1. Preparar cópia do piloto acessível externamente com autenticação e dados/conta
   de avaliação separados. Não expor o banco/API local ou o login do proprietário.
   Registrar Website e callback correspondentes somente após verificar o acesso.
2. Implementar tratamento de is_deleted com remoção do conteúdo persistido,
   identificação da conta e conversa corretas, proteção contra repetição e chegada
   fora de ordem. Conferir que uma sincronização posterior não ressuscite conteúdo
   cancelado. Testar primeiro com fixtures sintéticas locais, sem API da Meta.
3. Decidir e concluir a interação de exclusão no inbox e o escopo da resposta
   manual. Código de WhatsApp e o utilitário administrativo não comprovam que
   essas ações funcionam no Instagram.
4. Produzir a gravação quando os caminhos declarados estiverem demonstráveis.
   O dono do CRM não precisa repetir mensagens de teste para esta preparação.
   Uma futura ação em outra conta ou envio real exige autorização específica;
   os testes locais não exigem contatos com clientes.

## Proposta concreta de acesso do avaliador — não aplicada

- Instância separada da branch do piloto; manter produção bloqueada.
- Novo banco de avaliação e sessão exclusivos, inicialmente sem histórico real.
- Site HTTPS com login próprio e acesso limitado ao tenant de avaliação.
- Banco e Redis sem portas públicas; segredos somente no servidor de testes.
- Avaliadores conectam suas próprias contas Meta. Nenhuma senha Meta fornecida.
- Não compartilhar o banco atual de @joaobosco.pro ou sua senha local com a Meta.
- Retirar o acesso de avaliação ao encerrar a análise e executar o procedimento
  de limpeza aplicável aos dados de teste. Prazo deve acompanhar a análise, sem
  prometer data de aprovação nem derrubar o site antes da avaliação.

Essa proposta amplia a exposição além do callback/webhook atualmente autorizado.
Não foi provisionada/publicada, não há compra de servidor e nenhuma alteração de
DNS, WAF, produção ou permissões Meta nesta preparação técnica.
