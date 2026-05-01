import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso',
  description: 'Termos de Uso do SistemaZapChat',
}

export default function TermsOfUsePage() {
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

        <h1 className="text-3xl font-bold tracking-tight mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">Última atualização: 1 de maio de 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e utilizar o SistemaZapChat, você concorda com estes Termos de Uso e com nossa{' '}
              <Link href="/privacy" className="text-primary hover:underline">Política de Privacidade</Link>.
              Se você não concordar com qualquer parte destes termos, não utilize a plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">2. Descrição do Serviço</h2>
            <p>
              O SistemaZapChat é uma plataforma SaaS de vendas e atendimento via WhatsApp que oferece,
              entre outras funcionalidades:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Disparo de mensagens em massa.</li>
              <li>Menções em grupos e extração de membros.</li>
              <li>Assistentes virtuais com inteligência artificial.</li>
              <li>Atendimento por chat (inbox multi-atendente).</li>
              <li>CRM com funil Kanban e gestão de contatos.</li>
              <li>Integração com Google Calendar e outros serviços.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">3. Cadastro e Conta do Usuário</h2>
            <p>
              Para utilizar a plataforma, é necessário criar uma conta fornecendo informações verdadeiras
              e atualizadas. Você é responsável por:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Manter a confidencialidade de suas credenciais de acesso.</li>
              <li>Todas as atividades realizadas em sua conta.</li>
              <li>Notificar imediatamente qualquer uso não autorizado.</li>
            </ul>
            <p>
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">4. Uso Aceitável</h2>
            <p>Ao utilizar o SistemaZapChat, você se compromete a <strong>não</strong>:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Enviar mensagens não solicitadas (spam) ou conteúdo ilegal, ofensivo ou prejudicial.</li>
              <li>Violar leis locais, estaduais, nacionais ou internacionais.</li>
              <li>Coletar informações de terceiros sem consentimento.</li>
              <li>Utilizar a plataforma para atividades fraudulentas ou enganosas.</li>
              <li>Tentar acessar contas, sistemas ou dados de outros usuários.</li>
              <li>Interferir no funcionamento da plataforma ou de suas infraestruturas.</li>
              <li>Realizar engenharia reversa, descompilar ou desmontar qualquer parte do serviço.</li>
              <li>Violar as políticas de uso do WhatsApp ou de qualquer serviço integrado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">5. Planos e Pagamento</h2>
            <p>
              O SistemaZapChat pode oferecer planos gratuitos e pagos. Ao assinar um plano pago:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Você autoriza a cobrança no valor e periodicidade do plano escolhido.</li>
              <li>Cobranças são processadas antecipadamente pelo período contratado.</li>
              <li>Cancelamentos podem ser solicitados a qualquer momento, sem reembolso proporcional de períodos já pagos.</li>
              <li>Preços podem ser reajustados com aviso prévio de 30 dias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo, código, design, marcas e materiais do SistemaZapChat são de propriedade
              exclusiva da plataforma e protegidos pelas leis de propriedade intelectual aplicáveis.
            </p>
            <p>
              O conteúdo criado pelo usuário (mensagens, templates, configurações) permanece de propriedade
              do usuário. Ao utilizar a plataforma, você concede ao SistemaZapChat uma licença limitada para
              processar e armazenar esse conteúdo exclusivamente para fornecer o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">7. Integrações com Serviços Terceiros</h2>
            <p>
              O SistemaZapChat pode ser integrado a serviços de terceiros (WhatsApp, Google Calendar,
              provedores de IA). Você reconhece que:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>O uso desses serviços está sujeito aos termos de cada provedor.</li>
              <li>Não somos responsáveis por indisponibilidades ou alterações em serviços terceiros.</li>
              <li>Você é responsável por garantir o uso adequado das APIs e serviços integrados.</li>
              <li>O SistemaZapChat não se responsabiliza por suspensões de contas WhatsApp decorrentes de uso inadequado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">8. Limitação de Responsabilidade</h2>
            <p>
              O SistemaZapChat é fornecido "como está" ("as is"). Na máxima extensão permitida pela lei:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Não garantimos disponibilidade ininterrupta ou livre de erros do serviço.</li>
              <li>Não nos responsabilizamos por danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso da plataforma.</li>
              <li>Nossa responsabilidade total está limitada ao valor pago pelo usuário nos últimos 12 meses.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold">9. Encerramento</h2>
            <p>
              Você pode encerrar sua conta a qualquer momento entrando em contato conosco.
              Reservamo-nos o direito de encerrar ou suspender contas que violem estes termos,
              com ou sem aviso prévio.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">10. Alterações nos Termos</h2>
            <p>
              Podemos modificar estes Termos de Uso a qualquer momento. Alterações significativas
              serão comunicadas por e-mail ou aviso na plataforma com pelo menos 15 dias de antecedência.
              O uso continuado da plataforma após a publicação das alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">11. Legislação Aplicável</h2>
            <p>
              Estes termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa
              será submetida ao foro da comarca do responsável pela plataforma, com exclusão de qualquer outro,
              por mais privilegiado que seja.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold">12. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato:
            </p>
            <ul className="list-none pl-0 space-y-1">
              <li><strong>E-mail:</strong> <a href="mailto:contato@sistemazapchat.com" className="text-primary hover:underline">contato@sistemazapchat.com</a></li>
              <li><strong>Responsável:</strong> bertramvictor8@gmail.com</li>
            </ul>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Consulte também nossa Política de Privacidade &rarr;
          </Link>
        </div>
      </div>
    </div>
  )
}
