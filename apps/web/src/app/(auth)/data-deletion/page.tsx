import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Exclusão de dados do Instagram',
  description: 'Como solicitar a exclusão dos dados do Instagram tratados pelo SistemaZapChat',
}

export default function InstagramDataDeletionPage() {
  return <main className="mx-auto max-w-3xl space-y-8 px-6 py-16">
    <Link href="/privacy" className="text-sm text-primary hover:underline">Política de Privacidade</Link>
    <h1 className="text-3xl font-bold">Exclusão de dados do Instagram</h1>
    <p>A integração Instagram do SistemaZapChat está em fase de testes. Você pode solicitar a exclusão dos seus dados sem precisar informar sua senha ou seu token de acesso.</p>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Como solicitar</h2>
      <p>Envie um e-mail para <a className="text-primary hover:underline" href="mailto:privacidade@sistemazapchat.com">privacidade@sistemazapchat.com</a> com o assunto “Exclusão de dados do Instagram”. Informe a empresa que utiliza o CRM, o nome de usuário da conta Instagram conectada e se deseja excluir todos os dados dessa conexão ou somente os dados de uma conversa da qual você participa.</p>
      <p>Se você conversou com uma empresa pelo Direct, informe também seu nome de usuário do Instagram. A equipe pode pedir informações adicionais para confirmar sua identidade e localizar os registros, sem solicitar senhas, tokens ou documentos desnecessários. Você receberá uma referência para acompanhar o pedido.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">O que será excluído</h2>
      <p>Na exclusão completa da conexão, removemos do ambiente de testes o cadastro da conta conectada, a credencial armazenada, as conversas e as mensagens associadas. Autorizações de conexão ainda pendentes da mesma empresa são canceladas e precisam ser iniciadas novamente.</p>
      <p>Na exclusão de uma conversa, removemos as mensagens e o registro dessa conversa no CRM. A conexão da empresa e as demais conversas são preservadas. Uma nova mensagem enviada posteriormente poderá iniciar outra conversa.</p>
      <p>Para impedir que notificações antigas recriem dados excluídos, mantemos um registro técnico mínimo, com identificadores transformados em hash e a data da exclusão, sem o conteúdo das mensagens. Esse registro permanece enquanto a conexão existir e é removido na exclusão completa dela.</p>
      <p>A exclusão é permanente no CRM e não apaga mensagens no próprio Instagram nem dados mantidos pela Meta segundo suas próprias políticas. Se necessário, remova também a autorização nas configurações de aplicativos e integrações da Meta/Instagram.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Desconectar e excluir são ações diferentes</h2>
      <p>Desconectar pelo CRM desativa a conexão e remove a credencial armazenada, mas mantém as conversas já registradas. Para excluir esses registros, envie o pedido pelo canal de privacidade. A exclusão completa da conexão exige nova autorização para voltar a receber mensagens no CRM.</p>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Atendimento e confirmação</h2>
      <p>A equipe confirmará o recebimento e o escopo do pedido, verificará a identidade do solicitante e informará a conclusão. O atendimento segue os prazos e as condições da Política de Privacidade. Se houver dados sujeitos a retenção obrigatória ou presentes em cópias de segurança, a equipe informará o tratamento aplicável e as limitações da exclusão.</p>
      <p>Responsável pelo tratamento, conforme cadastro atual do CRM: bertramvictor8@gmail.com.</p>
    </section>
  </main>
}
