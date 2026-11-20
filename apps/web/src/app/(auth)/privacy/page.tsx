import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Política de Privacidade',
  description: 'Política de Privacidade do SistemaZapChat',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8">
          <Link
            href="/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Voltar ao login
          </Link>
        </div>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 11 de novembro de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">1. Informações que Coletamos</h2>
            <p>
              O SistemaZapChat coleta informações necessárias para fornecer e melhorar nossos serviços.
              As informações coletadas incluem:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone e senha (armazenada de forma criptografada).</li>
              <li><strong>Dados de uso:</strong> mensagens enviadas e recebidas via WhatsApp e, quando a integração opcional estiver disponível e for autorizada, mensagens do Instagram Direct, interações com contatos e conversas.</li>
              <li><strong>Dados de integração:</strong> tokens de acesso a serviços terceiros (Google Calendar, WhatsApp Business e Instagram) armazenados de forma criptografada.</li>
              <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e logs de acesso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Como Utilizamos suas Informações</h2>
            <p>Utilizamos as informações coletadas para:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Fornecer, manter e melhorar a plataforma SistemaZapChat.</li>
              <li>Processar mensagens e automatizar fluxos de atendimento via WhatsApp.</li>
              <li>Receber, organizar e permitir o atendimento de mensagens do Instagram Direct quando essa integração for autorizada, conforme a seção 10.</li>
              <li>Integrar com serviços solicitados pelo usuário (Google Calendar, assistentes de IA).</li>
              <li>Garantir a segurança e integridade da plataforma.</li>
              <li>Enviar notificações relevantes sobre o serviço.</li>
              <li>Cumprir obrigações legais e regulatórias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Compartilhamento de Dados</h2>
            <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Podemos compartilhar informações apenas nas seguintes situações:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Provedores de serviço:</strong> empresas que auxiliam na operação da plataforma (hospedagem, processamento de pagamentos), sob contrato de confidencialidade.</li>
              <li><strong>Integrações autorizadas:</strong> dados compartilhados com serviços conectados pelo próprio usuário (Google Calendar, APIs de IA e Meta/Instagram), conforme a finalidade e as permissões da integração. O piloto de Instagram descrito na seção 10 não encaminha Directs a serviços de IA.</li>
              <li><strong>Obrigação legal:</strong> quando exigido por lei, ordem judicial ou solicitação de autoridade competente.</li>
              <li><strong>Proteção de direitos:</strong> para proteger os direitos, a segurança ou a propriedade do SistemaZapChat ou de terceiros.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Armazenamento e Segurança</h2>
            <p>
              Seus dados são armazenados em servidores seguros com proteção física e lógica.
              Utilizamos criptografia (TLS/SSL) para dados em trânsito e criptografia AES-256 para dados sensíveis em repouso.
              Tokens de acesso a serviços terceiros são criptografados antes do armazenamento.
            </p>
            <p>
              Implementamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado,
              alteração, divulgação ou destruição. Entretanto, nenhum método de transmissão pela internet é 100% seguro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Retenção de Dados</h2>
            <p>
              Mantemos seus dados pessoais pelo tempo necessário para fornecer nossos serviços ou conforme exigido por lei.
              Ao excluir sua conta, seus dados são removidos ou anonimizados dentro de 30 dias, exceto quando a retenção
              for exigida por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Cookies e Tecnologias Similares</h2>
            <p>
              Utilizamos cookies e tecnologias similares para melhorar a experiência do usuário,
              manter sessões ativas e coletar dados analíticos. Você pode gerenciar suas preferências
              de cookies nas configurações do navegador.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Seus Direitos (LGPD)</h2>
            <p>
              De acordo com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018), você tem direito a:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Confirmar a existência de tratamento de dados pessoais.</li>
              <li>Acessar seus dados pessoais.</li>
              <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
              <li>Solicitar a portabilidade dos dados.</li>
              <li>Revogar o consentimento a qualquer momento.</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato pelo e-mail{' '}
              <a href="mailto:privacidade@sistemazapchat.com" className="text-primary hover:underline">
                privacidade@sistemazapchat.com
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre
              alterações significativas por e-mail ou por aviso na plataforma. A data de "última atualização"
              no topo desta página indica quando a política foi revisada pela última vez.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Contato</h2>
            <p>
              Se você tiver dúvidas sobre esta Política de Privacidade ou sobre o tratamento de seus dados pessoais,
              entre em contato:
            </p>
            <ul className="list-none pl-0 space-y-1">
              <li><strong>E-mail:</strong> <a href="mailto:privacidade@sistemazapchat.com" className="text-primary hover:underline">privacidade@sistemazapchat.com</a></li>
              <li><strong>Responsável pelo tratamento:</strong> bertramvictor8@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Integração opcional com o Instagram</h2>
            <p>
              A integração com o Instagram está em fase de piloto, disponível apenas para contas de teste autorizadas.
              A conexão é opcional e depende da autorização de uma pessoa com permissão para administrar a conta
              profissional. A autenticação ocorre na Meta; não solicitamos a senha do Instagram no CRM.
            </p>
            <p>
              Tratamos o identificador e o nome de usuário da conta profissional conectada, o identificador do
              portfólio empresarial informado pela Meta e os dados de autorização necessários à conexão.
              Para organizar o atendimento, tratamos o texto das mensagens recebidas e das respostas enviadas
              pelo CRM, os identificadores dos participantes e das mensagens, datas e horários e o estado do envio.
              Esses dados são usados para exibir as conversas e permitir o atendimento pela empresa responsável
              pela conta conectada, dentro das permissões e regras da Meta.
            </p>
            <p>
              Nesta fase, a integração atende mensagens de texto e não importa automaticamente o histórico anterior.
              Respostas por inteligência artificial, automações de comentários e tratamento de anexos não fazem parte
              deste piloto. A conexão não concede acesso às conversas a outras empresas clientes do CRM.
            </p>
            <p>
              A Meta participa da autenticação e da transmissão das mensagens. No piloto, os dados são armazenados
              em ambiente de testes separado do CRM principal, e a Cloudflare intermedeia a conexão HTTPS usada
              para receber as autorizações e notificações de mensagens. Os tokens de acesso são armazenados
              criptografados; isso não significa que o conteúdo das conversas receba a mesma criptografia em repouso.
            </p>
            <p>
              Ao desconectar a conta no CRM, desativamos a conexão e removemos o token armazenado nesse ambiente.
              Essa ação não exclui automaticamente as conversas já armazenadas nem revoga, por si só, a autorização
              na Meta. Você também pode remover a autorização nas configurações de aplicativos e integrações da Meta/Instagram.
              Para solicitar a exclusão dos dados do Instagram armazenados pelo CRM, utilize o contato de privacidade
              da seção 9, informando a empresa e a conta conectada. Não envie senhas ou tokens. A desconexão ou a
              exclusão no CRM não apaga as mensagens existentes no próprio Instagram.
            </p>
            <p>
              Consulte o <Link href="/data-deletion" className="text-primary hover:underline">procedimento de exclusão de dados do Instagram</Link>
              {' '}para conhecer os dados necessários ao pedido, as opções de exclusão e a confirmação do atendimento.
            </p>
            <p>
              Na exclusão de uma conversa, mantemos apenas o registro técnico mínimo necessário para impedir sua
              recriação por notificações antigas: identificadores transformados em hash e a data da exclusão,
              sem o conteúdo das mensagens. Esse registro é removido na exclusão completa da conexão.
            </p>
            <p>
              Antes de disponibilizar novas funções ou ampliar o piloto para clientes, atualizaremos esta descrição
              para refletir os dados tratados, os serviços envolvidos e as condições de funcionamento da integração.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Consulte também nossos Termos de Uso &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
