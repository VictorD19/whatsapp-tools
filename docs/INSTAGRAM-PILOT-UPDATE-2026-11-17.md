# Atualização isolada do piloto — 17/11/2026

Release ativa: `shared-20261117-r3`. URL: https://instagram-review.sistemazapchat.com/instagram .
Imagem Linux amd64 construída localmente; arquivo transferido SHA-256:
`e5e5ad30d61f0eb95105ae8ec2cdecc71f2cd46b4eda22a411e5311143fbda35`.
Código da interface: `706a260c44ac6dd57ab6c5103c560492c48a2593`.
CI Tests e Docker Build: https://github.com/VictorD19/whatsapp-tools/actions/runs/44109269301 .

## Resultado verificado

- Botão de sincronização incompatível com o ambiente restrito removido. Envios
  desativados explicitamente, sete abas preservadas, cinco delas identificadas
  como prévias. Avisos transitórios se recuperam após a API voltar.
- Onze verificações HTTPS e seis verificações de isolamento passaram.
- Backup AES-GCM restaurado antes e depois: dois usuários recuperados. Backup
  final no servidor: `instagram-20261117T152140Z.dump.aesgcm`, 130120 bytes.
- Os seis containers principais mantiveram IDs e horários de início. Apenas o
  app do piloto foi recriado. Sem migração, alteração ou reinício no CRM principal.
- Aproximadamente 13 GiB livres no disco (85% de uso), memória disponível 1623 MiB,
  swap em uso 730 MiB. Medição pontual, não ensaio de capacidade para 50 clientes.
- Acesso SSH temporário removido às 15:23:15 UTC; nova conexão recusada. Entradas
  de outras chaves preservadas. API, gateway e frontend de avaliação locais
  encerrados; bancos locais preservados. O receptor público continua no servidor.

## Correção operacional

Comandos somente de leitura do backup agora usam stdin fechado; apenas a
restauração recebe os bytes explícitos do dump. Isso evita consumir acidentalmente
um script de instalação transmitido pela entrada padrão. A implantação foi feita
por arquivo enviado e executado no servidor; não por script transmitido ao shell.
A restauração posterior validou a versão corrigida. R2 e sua imagem permanecem
como opção de reversão; não alterar o projeto Docker principal para reverter.

## Meta e limites

Instruções técnicas salvas no rascunho 1690021079384646, não enviado. Cadastro
empresarial bloqueado por solicitação de acesso pendente na sessão disponível.
Razão social XTRATEGY DIGITAL MARKETING (FZE) e país Emirados Árabes Unidos
localizados em documento empresarial compartilhado e preenchidos no rascunho.
Responsável confirmou não ter fornecido dados por segurança nacional nos últimos
12 meses e não ter os procedimentos apresentados formalizados. Não e Nenhuma
das opções acima salvos no rascunho. Relação de operadores/países ainda incompleta.
Não foi aceita concordância nem entregue senha à Meta. Gravação final pendente.
Direct real por webhook ainda não comprovado. Mensagem antiga Teste ZapChat 15
validada na Graph API foi preparada somente localmente como histórico, sem
transferência ao servidor. Nenhuma nova mensagem solicitada ou enviada.

A revisão automática recusou exportar o backup para este computador por faltar
permissão específica do destino. Não houve tentativa de contorno nem exportação.
A cópia cifrada atual permanece no servidor, com restauração verificada. A cópia
externa de 16/11 é histórica, não deve ser apresentada como backup desta revisão.
O responsável autorizou depois a cópia criptografada local em 17/11; ela fica
para a próxima janela de acesso, sem reabrir a chave já removida. Não é
pré-requisito para a atualização já concluída. Evidências privadas em `.instagram-test/shared-host`.
