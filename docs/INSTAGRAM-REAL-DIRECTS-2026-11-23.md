Estado posterior: **R8 publicada, avaliador isolado validado, cancelamento real e exclusão local concluídos.** Vídeo completo pronto localmente; upload persistido ainda pendente. [Estado vigente](INSTAGRAM-PILOT-R8-PUBLISHED-2026-11-23.md). O relato abaixo preserva a sequência anterior.

# Directs reais confirmados no piloto — 23/11/2026

O recebimento real foi resolvido no piloto após seguir a orientação do suporte da Meta: configuração Facebook Login for Business com usuário do sistema, conta do Instagram e Página vinculada, incluindo pages_show_list. O CRM principal não foi alterado.

## Evidência real

Com autorização específica do proprietário, uma única mensagem foi enviada de @agenciainstapush para @joaobosco.pro. O piloto registrou o conteúdo exato pelo canal messaging às 13:12:48.787 UTC, status received. Não houve importação de histórico nem evento sintético usado como prova.

A resposta autorizada “Recebido no piloto ZapChat.” foi enviada pelo piloto às 13:15 UTC e persistiu com status sent. A mensagem também apareceu na conversa da conta remetente. A liberação era restrita à empresa do proprietário, sua conta receptora e o remetente autorizado. Foi removida após o envio, com retorno do app à saúde e verificação explícita de sendEnabled=false e ausência do escopo temporário. O temporizador de segurança foi encerrado depois da remoção manual.

Onze verificações HTTPS posteriores passaram, incluindo bloqueio de resposta e importação. Um novo backup criptografado foi restaurado com dois usuários recuperados: instagram-20261123T160745Z.dump.aesgcm. A comparação dos IDs e horários de início dos seis serviços principais permaneceu idêntica à captura anterior à R7.

## Meta e material de revisão

Após autorização específica, foi aplicada a classificação de Provedor de Tecnologia no aplicativo de testes. A empresa Xtrategy Digital Marketing continua exibida como verificada. Isso não equivale a aprovação de acesso avançado. A Meta incluiu automaticamente permissões extras na análise; anúncios, publicação e comentários foram retirados somente do pedido, mantendo no rascunho pages_show_list, instagram_manage_messages, instagram_basic e public_profile. A revisão automática bloqueou a retirada de public_profile; a alternativa segura foi preservá-la.

Vídeos reais preparados localmente em output/instagram-meta-review-20261123:
- zapchat-authorization-page-20261123.mp4: seleção da Página e Instagram e confirmação da conexão.
- zapchat-instagram-real-flow-20261123.mp4: autorização, trecho da chegada real, resposta e resultado confirmado.

O vídeo é uma edição de capturas reais; a autorização foi regravada depois da demonstração, o que está declarado na legenda. A lista de outros contatos foi ocultada nos trechos de mensagens. Não contém senha pessoal, token ou mensagens de outros contatos. O resultado final foi inspecionado visualmente e o arquivo completo decodificado sem erro, duração aproximada de 59 segundos.

O seletor documentado de arquivo do navegador integrado expirou, tanto pelo botão como pelo input. O Chrome foi aberto como alternativa, mas a interação nativa não permitiu confirmar a seleção do arquivo. **Nenhum upload novo foi confirmado como persistido.** A tentativa de abrir um seletor não deve ser registrada como anexo salvo. O vídeo antigo de autorização permanece histórico e não substitui a demonstração nova.

## Preparação do avaliador R8

Código 5ba02dd, imagem shared-20261123-r8 compilada a partir de Git archive. 107 testes Instagram e dez testes de host/gateway passaram. A política compilada foi conferida em contêiner sem rede: empresa separada permitida com prazo, proprietário bloqueado, ausência de contexto bloqueada, prazo expirado bloqueado. A imagem não foi publicada.

A preparação permite respostas manuais só na empresa instagram-meta-review, por contas autorizadas nessa própria empresa, com revalidação da posse da conta/conversa, token, janela de 24 horas, controle ativo e prazo máximo de 31 dias. O transporte exige contexto da empresa; o gateway também fecha a rota quando o prazo termina. Registro público, importação e IA continuam bloqueados. A conexão do proprietário e seus dados não são transferidos para o avaliador.

Foi solicitada autorização para publicar e ativar essa liberação até 07/12/2026 às 23:59 UTC. **Aguardando confirmação.** Também foi solicitada confirmação das concordâncias de uso permitido para salvar os formulários sem enviar a análise. Não marcar concordâncias, compartilhar credenciais ou submeter por suposição.

A última versão publicada permanece R7. A análise não está pronta para envio enquanto faltarem ativação/validação do avaliador, anexos persistidos, instruções/credencial separada revisadas e concordâncias confirmadas.
