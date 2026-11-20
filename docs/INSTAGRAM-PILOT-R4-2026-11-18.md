Atualização em 20/11: a publicação foi concluída. O estado “aguardando acesso”
abaixo registra a preparação de 18/11. Consulte o
[recibo da publicação e os limites atuais](INSTAGRAM-PILOT-R4-PUBLISHED-2026-11-20.md).

# Piloto R4 — pacote validado, publicação aguardando acesso

Estado em 18/11/2026: **não publicado**. O acesso temporário anterior foi removido
e a tentativa atual retornou Permission denied (publickey). Reativação por até duas
horas solicitada ao responsável. Nenhuma alteração no servidor nesta preparação.

## Pacote pronto

- Release: `shared-20261118-r4`, código `56c7293`, anterior `shared-20261117-r3`.
- Contexto construído somente do arquivo Git desse commit, sem arquivos locais
  modificados, credenciais, gravações ou banco.
- Imagem Linux amd64 `zapchat-instagram-pilot:shared-20261118-r4`.
- Pacote local `.instagram-test/shared-host/pilot-amd64-r4.tar.gz`, 432662737 bytes.
- SHA256: `66d649bf05ec147c61d3d5e547ed058c419788ae9d5ad012e67fdfa619cd810a`.
- CI do código: Tests e Docker Build aprovados no run 44346195843.
- Imagem final executada localmente com banco/segredos fictícios, sem túnel,
  mesmos limites de recursos compartilhados. Saudável, sem reinícios. Onze
  verificações HTTP aprovadas; DELETE novo exige autenticação (401).
- Serviços locais desse ensaio foram parados, sem exclusão de volumes.
- Piloto público anterior: onze verificações aprovadas, envio e importação
  bloqueados, conta autorizada presente; evento de webhook assinado vazio não
  representa recebimento de Direct.

## Aplicação preparada

Script privado `.instagram-test/shared-host/apply-r4.sh`, sintaxe validada:

1. Confere host SistemaZapChat, usuário administrativo, symlink da R3, hash do
   pacote e pelo menos 5 GiB livres; recusa repetição de recibo existente.
2. Registra IDs, início e execução dos seis serviços principais, por leitura.
3. Cria backup AES-GCM do banco exclusivo do piloto e restaura em base temporária;
   exige restauração e pelo menos os dois usuários existentes antes de prosseguir.
4. Carrega a imagem pronta e troca somente `app` do projeto `zapchat-instagram-lab`.
   Não constrói no servidor, não altera os serviços principais nem configurações
   do túnel, não contrata recursos.
5. Confere saúde, isolamento do avaliador, envio bloqueado e autenticação da nova
   rota. Se a aplicação ou verificações falharem, retorna o app para R3.
6. Compara os seis serviços principais, troca o symlink do piloto e cria novo
   backup com restauração verificada. Mantém imagem anterior para reversão.
7. Confere novamente pelo HTTPS público, copia backup criptografado ao destino
   local já autorizado com hash/descriptografia verificados e remove a chave
   temporária ao concluir. A cópia local adicional permanece pendente.

## Meta

As instruções salvas no rascunho foram atualizadas e reabertas para confirmar a
persistência: vídeo de autorização anexado em instagram_basic, falhas anteriores
restritas às tentativas IAB/ZIP. Sem concordância adicional ou submissão final.

A publicação da correção não conclui a análise: ainda falta demonstrar o fluxo
hospedado exigido de mensagens. Respostas reais continuam bloqueadas; nenhum
Direct foi enviado, nenhuma mensagem real excluída e nenhuma nova mensagem de
teste solicitada. Não apresentar dados fictícios ou históricos como webhook
real. Não declarar o pacote completo antes de comprovar os caminhos exigidos.
