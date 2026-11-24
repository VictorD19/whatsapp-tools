# Procedimento de exclusão de dados do Instagram no piloto

Preparado em 11/11/2026. Executável somente no laboratório local, sem endpoint
público de exclusão. O pedido chega pelo canal já cadastrado no CRM:
**privacidade@sistemazapchat.com**. Responsável conforme cadastro existente:
**bertramvictor8@gmail.com**. Os dados foram mantidos por orientação do usuário;
o funcionamento dessa caixa de e-mail não foi testado com envio de mensagens.

## Atendimento do pedido

1. Registrar referência do atendimento, data de recebimento, empresa, conta
   Instagram e escopo solicitado. Manter o registro de atendimento em local de
   acesso restrito, separado do código e dos comprovantes técnicos. Não copiar
   corpos de mensagens ou tokens para o registro.
2. Confirmar a identidade. Para o administrador, validar a solicitação pela
   sessão autenticada e pelo contato cadastrado da empresa; não confiar apenas
   no remetente de um e-mail. Para participante de Direct, confirmar a relação
   entre o perfil solicitante e o identificador da conversa, por canal já
   verificado, antes de excluir dados. Não solicitar senha, token ou documentos
   desnecessários. Não revelar conversas de outros participantes.
3. Confirmar o escopo com o solicitante: **conexão completa** ou **uma conversa**.
   Localizar os identificadores internos usando a mesma empresa. Não deduzir
   a conta somente pelo nome de usuário, que pode mudar. Se faltar comprovação
   ou houver obrigação de retenção, encaminhar ao responsável e registrar a
   decisão, em vez de executar a exclusão automaticamente.
4. O responsável acompanha o pedido até a conclusão, conforme a política
   existente. Para exclusão de conta, ela prevê até 30 dias, salvo retenção
   obrigatória. Esse é um prazo de atendimento administrativo; o programa não
   recebe e-mails nem agenda a execução. Registrar pendências, prazo e quem
   executará. Não considerar um pedido concluído só por desconectar a conta.

## Efeito de cada opção

| Escopo | Remove no banco do piloto | Preserva |
| --- | --- | --- |
| Conexão completa | Conta e token armazenado, identificadores associados, todas as conversas e mensagens dessa conexão | Outras contas, outras empresas, WhatsApp e registros do CRM principal |
| Uma conversa | Registro da conversa e todas as mensagens dela | Conta/token da empresa e demais conversas |

Na exclusão completa, também são cancelados os estados OAuth pendentes da mesma
empresa no Redis do laboratório. A empresa precisará iniciar novamente eventuais
conexões em andamento. Sem a conta no banco, notificações posteriores dessa
conexão são ignoradas pelo serviço; uma nova conexão exige nova autorização.
Na exclusão de uma conversa, novas mensagens futuras podem criar outra conversa.
Não é um bloqueio permanente do participante.

Na exclusão de participante, um registro mínimo de prevenção de reentrega é
mantido no Redis do piloto: hashes derivados da empresa/conta/participante e
horário da exclusão, sem texto, username ou token. Não é anonimização garantida;
é um dado técnico pseudonimizado, conservado enquanto existir a conexão para
ignorar eventos anteriores ao horário registrado. A exclusão completa da conta
remove também esses registros. Se o Redis estiver indisponível ou o registro
estiver inválido, o recebimento falha sem persistir a mensagem, permitindo
repetição posterior pela Meta em vez de recriar dados apagados.

Não há chamada de revogação, exclusão ou envio à Meta nesse procedimento. A
autorização pode ser removida pelo titular nas configurações da Meta/Instagram.
Mensagens existentes no Instagram e cópias mantidas por terceiros não são apagadas.

## Execução no laboratório

O utilitário aceita apenas as empresas `instagram-lab` e `instagram-other` e usa
endereços fixos: PostgreSQL `127.0.0.1:15432/instagram_lab` com usuário
`instagram_lab`; Redis `127.0.0.1:16379/2`. Não lê `DATABASE_URL` nem aceita
parâmetro de servidor. Não aplicar esse utilitário em produção.

Preparar a prévia, após verificar o solicitante e localizar a conta:

```sh
node tools/instagram-data-deletion.mjs prepare --tenant instagram-lab --account ID_INTERNO_DA_CONTA
# Para excluir somente a conversa de um participante:
node tools/instagram-data-deletion.mjs prepare --tenant instagram-lab --account ID_INTERNO_DA_CONTA --participant ID_INSTAGRAM_DO_PARTICIPANTE
```

A prévia informa a conta, o modo, o escopo e as quantidades, sem mostrar mensagens
ou credenciais. O plano privado vale por 15 minutos. Conferir os dados com o
pedido antes de prosseguir. Não executar na conta real para experimentar.

1. Parar o processo **api-meta/api do laboratório**, incluindo o observador que
   pode reiniciá-lo. Não parar nenhum servidor do CRM principal. Não iniciar
   a API novamente até terminar a operação. Confirmar que não há outra cópia
   da API ou consumidor Instagram usando esse banco de testes.
2. Executar somente o plano conferido:

   ```sh
   node tools/instagram-data-deletion.mjs execute --request UUID_DA_PREVIA --confirm EXCLUIR
   ```

3. O utilitário recusa execução se a API estiver escutando em `18001`, se o
   plano expirou ou se o conjunto de dados divergir da prévia. A remoção de
   mensagens, conversas e conta é uma transação única. Antes de confirmar,
   verifica a ausência dos registros no escopo; falha nessa etapa reverte
   a transação. O cancelamento prévio de OAuth no Redis não é revertido em
   caso de erro no PostgreSQL; pode ser necessário iniciar novo login.
   A proteção contra reentrega também pode permanecer caso uma exclusão de
   participante falhe depois de gravá-la; revisar a operação antes de reabrir
   o recebimento. Não remover essa proteção durante uma restauração sem
   reaplicar primeiro o registro restrito de exclusões.
4. Guardar o comprovante privado em
   `.instagram-test/deletion/UUID.receipt.json`: referência, horário, escopo,
   quantidades e número de autorizações canceladas. Não contém identificadores
   de conta, mensagens ou tokens. O plano com identificadores é removido após
   sucesso. Planos expirados/cancelados precisam ser removidos pelo operador
   depois da conferência; não os copiar para Git ou Obsidian.
5. Se houver erro após a transação, conferir o comprovante e o banco antes de
   repetir. Um erro ao gravar o arquivo não prova que a exclusão foi revertida.
   Não recriar dados removidos para repetir a operação. Documentar o resultado
   no atendimento sem copiar os dados excluídos.
6. Reativar `node tools/instagram-lab.mjs api-meta`, mantendo envio real desligado.
   Confirmar a saúde do laboratório e que contas não abrangidas continuam
   disponíveis. Informar ao solicitante o escopo, a data de conclusão e qualquer
   retenção ou limitação aplicável.

## Cópias de segurança e retenção

A remoção é lógica no banco da aplicação; não é promessa de sobrescrita física
de disco, WAL ou arquivos internos do PostgreSQL. Não gerar um dump dos dados a
excluir como parte desse procedimento. A atomicidade protege contra remoção
parcial, mas uma exclusão concluída não possui botão de desfazer.

Antes de concluir o atendimento, inventariar dumps, snapshots, exports, cópias
de volume e arquivos temporários que possam conter os dados do pedido. Os
backups de notas de desenvolvimento não substituem esse inventário. O ensaio
deste procedimento não audita backups existentes da infraestrutura principal.

Se houver cópias abrangidas, registrar onde estão, quem tem acesso e quando
serão eliminadas/expirarão. Se for possível eliminá-las com segurança, fazê-lo
segundo a política aplicável. Não apagar um backup compartilhado que proteja
outros clientes sem avaliação e autorização próprias. Quando existir retenção
necessária, restringir o uso e informar motivo e prazo ao solicitante. Não
prometer eliminação total enquanto essa etapa estiver pendente.

Durante a vida de qualquer cópia retida, manter registro restrito e mínimo do
escopo necessário para reaplicar a exclusão. Antes de restaurar uma cópia,
manter o ambiente restaurado isolado, reaplicar os pedidos posteriores ao
backup, invalidar autorizações antigas e verificar a ausência dos dados antes
de liberar o serviço. Eliminar o registro de identificação do pedido quando
cessar essa necessidade, preservando só o comprovante mínimo permitido.

## Evidências do ensaio

- Testes de validação: recusam empresa fora do laboratório, identificador
  inválido, plano expirado e snapshot inválido.
- Integração em PostgreSQL/Redis locais: outra empresa não acessa o escopo;
  prévia alterada é recusada; exclusão de participante preserva a outra
  conversa; exclusão completa remove conta, mensagens e conversas; OAuth
  da outra empresa é preservado.
- Contagens das tabelas WhatsApp e usuários e conteúdo das contas Meta
  existentes foram comparados antes/depois e permaneceram iguais.
- Dados do ensaio eram fictícios e foram removidos ao final.
- O percurso real do utilitário também foi ensaiado: arquivo de prévia privado,
  confirmação incorreta recusada, confirmação correta aceita, prévia removida
  e comprovante gerado com permissão de arquivo 600.
- A API foi reativada com envio real desligado. O utilitário recusa execução
  com a API ativa.

Testes reproduzíveis:

```sh
node --test tools/instagram-data-deletion.test.mjs
# Com API de testes parada; não exige nem usa Meta:
node tools/instagram-data-deletion.integration.mjs
```

Página de instruções local: `http://localhost:18080/data-deletion`. Política local:
`http://localhost:18080/privacy`. As duas páginas foram publicadas, após backup
e testes de recuperação, em `https://sistemazapchat.com/data-deletion` e
`https://sistemazapchat.com/privacy`. Somente a interface foi atualizada; o
módulo Instagram permanece no laboratório. URLs não foram cadastradas no painel
Meta nesta publicação. O túnel autorizado continua restrito ao callback/webhook.
