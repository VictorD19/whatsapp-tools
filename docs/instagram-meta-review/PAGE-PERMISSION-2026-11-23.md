# Página vinculada: reconexão e preparação da justificativa

Em 23/11, após autorização do proprietário, a Meta confirmou a conexão de Joao Bosco, Página Joaobosco.pro e Instagram joaobosco.pro. O primeiro retorno usou estado expirado; uma nova entrada com os mesmos ativos concluiu. Diagnóstico de leitura às 12:32 UTC verificou novo token SYSTEM_USER válido, aplicativo correto, pages_show_list, instagram_basic, instagram_manage_messages e public_profile. Vencimento informado pelo piloto: 22/01/2027 às 12:31 UTC. Há exatamente uma Página atribuída, a esperada. Inscrições messages/standby ativas e callback do piloto correto. Nenhuma mensagem enviada nesta etapa.

O endpoint oficial de leitura usado para conferir a atribuição da Página é https://developers.facebook.com/docs/graph-api/reference/user/assigned_pages/ . A consulta permaneceu no servidor; tokens não foram exportados ou incluídos nos registros.

## Justificativa proposta para pages_show_list (a validar na demonstração)

ZapChat Social Lab uses pages_show_list during Facebook Login for Business so a business administrator can authorize the Facebook Page linked to the professional Instagram account they connect to the isolated CRM pilot. The administrator explicitly selects the Page and Instagram account. The pilot uses the resulting connection for Instagram Direct customer service; it does not publish Page posts, manage advertisements or request Page messaging permissions. The linked Page asset is included following Meta Business Messaging Support guidance in case 2256928134873004. Advanced Access is needed for business administrators outside the app roles to connect their own assets after approval.

## Evidência ainda necessária

Recebimento real por webhook ainda não comprovado. Uma demonstração nova entre as duas contas do proprietário foi solicitada, sem pedir envio manual. A autorização anterior de 21/11 já foi consumida. Envios permanecem desligados. Não declarar recebimento, resposta ou vídeo completo sem evidência real. pages_show_list precisa ser incluída no rascunho e demonstrada junto ao login.

## Requisito adicional observado na Meta

Ao escolher Adicionar à análise do app para pages_show_list, a Meta abriu o aviso “Para adicionar uma permissão ou recurso à análise do app, torne-se um Provedor de Tecnologia”. A tela avisa que a decisão não pode ser revertida e envolve verificações adicionais. Nenhuma alteração de classificação foi confirmada; autorização específica solicitada ao proprietário.

Fonte oficial: https://developers.facebook.com/docs/development/release/tech-providers/ . A verificação de acesso como Provedor de Tecnologia é independente da análise das permissões para acesso avançado. Contas com funções no app podem continuar os ensaios sob acesso padrão. Não declarar que apenas App Review resolve a abertura a todos os clientes.

A permissão pages_show_list ainda não foi acrescentada ao rascunho 1690021079384646 devido a essa exigência. O cadastro não equivale a publicar Instagram no CRM principal. A demonstração nova entre as duas contas permanece aguardando autorização; nenhuma nova mensagem foi enviada.
