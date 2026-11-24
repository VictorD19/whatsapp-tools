# Piloto R7 publicado — 23/11/2026

A versão shared-20261123-r7, código 13a1d4a, foi publicada apenas no projeto isolado zapchat-instagram-lab do SistemaZapChat. O proprietário renovou o acesso administrativo por até 12 horas nesta data. A configuração adicional do login Facebook é 2759508501174736; a entrada original do Instagram conserva 1680712757031270.

## Validação concluída

- Backup criptografado anterior: instagram-20261123T114107Z.dump.aesgcm; restauração em base temporária com dois usuários recuperados.
- Backup criptografado posterior: instagram-20261123T114242Z.dump.aesgcm; restauração em base temporária com dois usuários recuperados.
- Os seis serviços wt-web, wt-api, wt-redis, wt-evolution, wt-postgres e wt-minio mantiveram IDs, horários de início e estado de execução na comparação antes/depois.
- Seis verificações de isolamento do avaliador e cinco verificações das configurações de login passaram. Onze verificações HTTPS externas também passaram.
- App saudável, sem reinícios na inspeção. Envios reais e importação de histórico continuam bloqueados. Nenhuma mensagem foi enviada nesta publicação.
- R6 preservada para reversão. Snapshot privado da configuração anterior permanece no servidor, sem exportação de segredos.

## Reconexão e análise

A Meta abriu a revisão final selecionando somente o portfólio Joao Bosco, a Página Joaobosco.pro e o Instagram joaobosco.pro. Permissões exibidas: perfil/posts do Instagram, gerenciamento de Directs e listagem de Páginas. A confirmação final da nova concessão de Página foi solicitada ao proprietário; ainda não executada neste registro.

A orientação do suporte é uma solução proposta para a falta de acesso à Página vinculada; não é prova de recebimento. Ainda faltam confirmar a nova conexão, verificar os ativos/permissões retornados, comprovar webhook real e concluir gravação e reprodução pelo avaliador. A autorização anterior de uma mensagem foi consumida em 21/11; nenhum novo Direct pode ser enviado sem autorização específica.

O rascunho Meta 1690021079384646 permanece não submetido, com instagram_basic e instagram_manage_messages. pages_show_list ainda precisa entrar na solicitação de acesso avançado e na demonstração correspondente. Nenhuma concordância final da análise foi aceita.
