# Piloto R5 publicado — 21/11/2026

R5 (código dbbb328) publicada e verificada no servidor existente, somente em
/opt/zapchat-instagram-lab. Endereço: https://instagram-review.sistemazapchat.com/instagram.
O CRM principal não recebeu código, migrações ou reinícios. Os seis serviços wt-*
mantiveram IDs e horários de início idênticos antes/depois.

## Validação

- Backups AES-GCM antes (18:11UTC) e depois (18:12UTC) restaurados em base temporária,
  com dois usuários recuperados. Não é validação do backup do CRM principal.
- Cópia criptografada final autorizada salva no projeto local; hash igual ao servidor,
  descriptografia autenticada somente em memória e cabeçalho PGDMP conferidos.
- Seis checagens de isolamento do avaliador passaram; sem acesso à conta do dono.
- Onze verificações HTTPS passaram: login, autenticação, conta conectada, envio e
  histórico bloqueados, origem estrangeira negada, desafio e assinatura do webhook.
  POST vazio assinado não comprova recebimento real de Direct.
- App saudável, zero reinícios, imagem shared-20261121-r5. R4 preservada para reversão.
- Interface externa conferida: sete abas, conta joaobosco.pro preservada, sem envio
  real liberado. O remetente agenciainstapush aceitou o convite; a tabela Meta não
  mostra mais Pendente. Nenhum novo Direct foi enviado nesta publicação.

## Demonstração: próxima etapa autorizada, não executada nesta publicação

O proprietário autorizou uma única mensagem de agenciainstapush para joaobosco.pro
com o texto de validação combinado e uma resposta específica pelo piloto. Liberação
somente para esse par de contas, temporária, sem IA. A demonstração real e a
reprodução pelo avaliador continuam pendentes; análise Meta não pronta para envio.

Foi identificado aviso fixo de envio desativado na interface. Pequena correção
condicional preparada em 70f2c81, ainda não publicada nesta R5. Não alterar a página
pelo navegador para produzir uma gravação diferente do produto real.

Acesso administrativo autorizado por até doze horas foi habilitado no servidor;
continua em uso para a demonstração e deve ser removido ao concluir. Não marcar
remoção ou entrega real como concluída sem evidência posterior.
