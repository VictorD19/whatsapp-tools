# R4 publicada somente no piloto — 20/11/2026

O piloto está em `shared-20261118-r4`, código `56c7293`, no endereço
https://instagram-review.sistemazapchat.com/instagram. O CRM principal não recebeu
publicação, migração ou reinício. Os seis serviços wt-* mantiveram IDs e horários
de início idênticos antes/depois; recibos privados preservados.

## Publicação e reversão

A transferência de 432662737 bytes iniciada em 18/11 estava completa. SHA256 do
pacote conferiu: `66d649bf05ec147c61d3d5e547ed058c419788ae9d5ad012e67fdfa619cd810a`.
Não foi necessário reenviar nem construir no servidor.

A primeira tentativa detectou um caminho errado do verificador: ele não está
copiado dentro da imagem. A aplicação estava saudável, mas a verificação falhou;
a reversão automática retornou à R3. O procedimento foi corrigido para fornecer
o verificador existente na release pela entrada do Node no contêiner. A segunda
tentativa concluiu com sucesso. Não houve alteração da imagem/código validado.

Somente app do projeto zapchat-instagram-lab foi recriado. Banco, Redis, túnel,
redes e volumes principais não foram alterados. A R3 foi preservada para reversão.
Saúde final: healthy, zero reinícios; versão corrente R4.

## Backups e acesso

- Antes: instagram-20261120T130209Z.dump.aesgcm, 130129 bytes, restaurado em base
  temporária; dois usuários recuperados antes de substituir a aplicação.
- Depois: instagram-20261120T130309Z.dump.aesgcm, 130129 bytes, restauração também
  validada com dois usuários.
- Cópia criptografada final salva na pasta local do projeto já autorizada:
  `.instagram-test/shared-host/backups/20261120/`.
- SHA256 local/servidor idêntico:
  `c0a7a9a07612281e24515af06e267025c3bd29259ffab55a43f27e5541f4f023`.
  AES-GCM autenticado e assinatura PGDMP conferidos em memória, sem salvar arquivo
  descriptografado. Isso valida o backup do piloto, não o banco do CRM principal.
- Chave administrativa temporária removida em 20/11 às 13:07:54 UTC / 17:07:54
  Dubai. Uma entrada removida, demais entradas preservadas. Nova autenticação
  recusada, comprovando a revogação.

## Verificação externa

Onze verificações HTTPS passaram: login, autenticação, conta autorizada presente,
envio desligado, bloqueios de cadastro/resposta/importação/origem estrangeira,
desafio do webhook, evento assinado vazio e rejeição de assinatura ausente.
A nova rota DELETE exige autenticação. Seis verificações de isolamento do avaliador
passaram. Login e sete abas foram conferidos no navegador; conexão @joaobosco.pro
preservada. Nenhuma mensagem real foi enviada, importada ou excluída.

A consulta por leitura na Meta confirmou token válido, app correto, permissões
instagram_basic / instagram_manage_messages / public_profile, campos messages e
standby inscritos. Essa confirmação não comprova entrega de Direct por webhook.
A API do piloto retornou uma conta e zero conversas em 20/11 às 13:04 UTC.

## Estado real da análise Meta

Rascunho 1690021079384646 não enviado, ainda não pronto para submissão de mensagens.
Instruções atualizadas e reabertas para confirmar persistência: retorno OAuth
fixo da R4 e exclusão com confirmação publicados. O vídeo de autorização permanece
registrado como anexado em instagram_basic; não é vídeo completo de mensagens.

| Critério | Situação |
| --- | --- |
| Provedores e declarações factuais | Salvos; etapa de dados 100% na preparação anterior |
| Login/autorização e identidade | Gravação real exportada; vídeo de autorização anexado |
| Retorno OAuth automático | Publicado na R4; cinco testes HTTP da implementação |
| Exclusão pelo operador | Publicada; UI, banco e proteções verificados com dados fictícios locais |
| Recebimento real no piloto | Não comprovado; zero conversas persistidas |
| Resposta real no fluxo gravado | Não demonstrada; envio e rota permanecem bloqueados |
| Cancelamento real no fluxo gravado | Implementação testada com fixtures, sem demonstração real gravada |
| Acesso privado do avaliador na Meta | Conta separada existe; credencial ainda não transmitida |
| Concordâncias e envio final | Nenhuma nova concordância aceita; análise não enviada |

O guia específico exige o fluxo na versão submetida:
https://developers.facebook.com/documentation/business-messaging/instagram-messaging/app-review/apps-for-other-businesses .
Não substituir essa comprovação por histórico local, dados fictícios ou evento
vazio assinado. Nenhuma nova mensagem de teste foi solicitada.
