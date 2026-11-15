# Avaliação externa do Instagram — 15/11/2026

## Resultado confirmado

Website: https://instagram-review.sistemazapchat.com/login.
Login próprio validado no navegador. Website salvo no app Meta ZapChat Social Lab
1684815669905187. Novo callback OAuth salvo e confirmado após recarregar o painel:
https://instagram-review.sistemazapchat.com/api/v1/instagram/callback.
Os seis callbacks anteriores foram preservados.

OAuth real concluído com Joao Bosco / @joaobosco.pro: a Meta confirmou
"Instagram conectado" e a interface mostrou a conta em modo Meta. Somente perfil
e Direct; conta de anúncios em branco. O usuário aceitou os termos exibidos.
Nenhuma sincronização, importação de histórico ou mensagem enviada.

Depois da comprovação, o botão Desconectar neste ambiente removeu a conexão
temporária e apagou seu token somente do banco do avaliador. Não revogou o app
na Meta, não desconectou o laboratório original nem mudou o CRM principal.
O cadastro temporário inativo e sem conversas também foi retirado dessa cópia,
com metadados privados guardados para recuperação. Conferência externa final:
zero contas Meta listadas; zero tokens de conta no banco separado.
Não compartilhar credenciais enquanto houver token ou conversa do proprietário
na cópia. O formulário de análise Meta continua rascunho, não enviado.

## Isolamento e acesso

Banco e Redis exclusivos: instagram_review/25432 e Redis26379. API18011,
Web compilada18091 e gateway18012, todos escutando em loopback. JWT e criptografia
próprios. Segredos privados em .instagram-test/reviewer, fora do Git.
O gateway permite somente login/refresh, páginas selecionadas e rotas limitadas
do Instagram. Bloqueia cadastro, administração, documentação interna, source maps,
respostas reais e sincronização de histórico. Nenhum token de conta foi copiado
do laboratório original. A configuração privada do app Meta é reutilizada com
sendEnabled=false e callback restrito ao hostname do avaliador.

Ferramentas: tools/instagram-review.mjs, instagram-review-public.mjs e
instagram-review-gateway.mjs. A Web externa usa build Next standalone, sem
credenciais de provedor e com chamadas API na mesma origem.

Cloudflare: adicionado somente o CNAME instagram-review e uma regra no túnel
zapchat-instagram-pilot. A regra anterior de instagram-lab para callback/webhook
foi preservada. Configuração do túnel passou de versão1 para2. Recibo privado
public-access.json contém o registro DNS criado e as configurações antes/depois.
Não houve alteração dos registros DNS do CRM principal ou de WAF.

## Limites que continuam reais

- A hospedagem ainda depende deste computador ligado e conectado. Antes de enviar
  para revisão, transferir esta cópia para hospedagem de testes sempre disponível
  ou assegurar disponibilidade durante toda a avaliação. Não usar o servidor
  principal para resolver essa pendência.
- O callback OAuth novo funciona. O webhook global do app continua apontando para
  instagram-lab; não há encaminhamento confirmado de eventos reais ao banco do
  avaliador. Não apresentar a cópia externa como inbox real completo.
- O recebimento de Direct de usuário comum por webhook segue condicionado ao
  Advanced Access, conforme diagnóstico do suporte. Nenhum novo teste de mensagem
  foi pedido ou enviado nesta etapa.
- A prova visual de conexão foi salva. A captura de vídeo entre origens não
  registrou todo o percurso: há somente trecho parcial da autorização e capturas
  da conta conectada e da limpeza. Não é o vídeo final da análise Meta.
- Envio real e IA permanecem desligados. Nenhuma resposta real foi demonstrada.
- Nome legal/país e declarações organizacionais exigidas pela Meta ainda precisam
  de fonte/validação. Ausência de informação no GitHub não autoriza inventá-las.

## Verificação

Capturas: [conta conectada](instagram-meta-review/assets/reviewer-oauth-connected-20261115.png)
e [cópia limpa](instagram-meta-review/assets/reviewer-isolated-external-20261115.jpg).

60 testes Jest do módulo passaram em cinco suítes. A suíte do gateway, também
incluída no job existente de testes, verifica rotas permitidas/proibidas, recusa de
upstream diferente, Host não autorizado, Origin externo e redirecionamento inicial.
Login HTTPS validado pelo navegador; API sem sessão retorna401; cadastro e docs
retornam404. OAuth retornou sucesso e conta correta, depois desconectada localmente.
Build compilado da Web externa concluído. Não se declara TypeScript global da Web
aprovado: permanecem erros preexistentes fora desta entrega.

## Recuperação sem afetar produção

Para retirar somente o acesso público do avaliador: consultar a versão atual do
túnel, retirar exclusivamente a regra instagram-review preservando qualquer outra
regra e remover exclusivamente o registro DNS descrito no recibo. Não restaurar
cegamente a configuração antiga se houver alterações posteriores. Não desligar o
túnel compartilhado nem remover a regra instagram-lab.

Para reiniciar processos, confirmar PID e diretório antes de encerrar somente o
serviço de avaliação. start-api, start-public-web e start-gateway recusam portas
ocupadas. Não executar init do laboratório original. Builds alternam diretórios
privados; o arquivo public-build.json indica o build novo, que deve ser iniciado
apenas depois de parar a Web de avaliação anterior. Falha de build não deve
encerrar o processo anterior. As ferramentas não alteram DNS/túnel sozinhas.

## Próximas liberações

1. Fechar hospedagem contínua, entrega de eventos ao ambiente do avaliador e
   gravação real de todos os caminhos declarados, sem usar simulação como prova.
2. Completar declarações verificadas e revisar/submeter Advanced Access.
3. Após aprovação, validar no piloto; publicação no CRM principal é etapa futura,
   com backup e recuperação validados e autorização de publicação própria.
