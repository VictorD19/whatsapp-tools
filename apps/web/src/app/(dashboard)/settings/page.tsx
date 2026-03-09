'use client'

import React, { useState } from 'react'
import {
  User,
  Bell,
  Plug,
  AlertTriangle,
  Camera,
  Check,
  Loader2,
  ExternalLink,
  ChevronRight,
  BellOff,
  MessageSquare,
  Smartphone,
  Globe,
} from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { LocaleSettingsContent } from '@/components/settings/locale-settings'
import { useAuthStore } from '@/stores/auth.store'
import { getInitials } from '@/lib/utils'

/* ──────────────────── Shared helpers ──────────────────── */
function SectionBlock({
  icon: Icon,
  title,
  description,
  children,
  danger,
}: {
  icon: React.ElementType
  title: string
  description: string
  children: React.ReactNode
  danger?: boolean
}) {
  return (
    <section className="group">
      {/* Section header */}
      <div className="flex items-start gap-3 mb-6">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            danger ? 'bg-red-100 text-red-600' : 'bg-primary-50 text-primary-600'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${danger ? 'text-red-700' : 'text-gray-900'}`}>
            {title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        </div>
      </div>

      {/* Section body */}
      <div className={`rounded-xl border ${danger ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'} p-6`}>
        {children}
      </div>
    </section>
  )
}

/* ──────────────────── Page ──────────────────── */
export default function SettingsPage() {
  React.useEffect(() => { document.title = 'Configurações | SistemaZapChat' }, [])
  return (
    <PageLayout breadcrumb={[{ label: 'Configurações' }]}>
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações</h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie sua conta, preferências e integrações.</p>
        </div>

        <ProfileSection />
        <LocaleSection />
        <NotificationsSection />
        <IntegrationsSection />
        <DangerSection />
    </PageLayout>
  )
}

/* ──────────────────── Profile ──────────────────── */
function ProfileSection() {
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  React.useEffect(() => setMounted(true), [])

  const userName = mounted ? (user?.name ?? '') : ''
  const userEmail = mounted ? (user?.email ?? '') : ''
  const userRole = mounted ? (user?.role ?? '') : ''
  const userInitials = mounted && user ? getInitials(user.name) : '?'
  const userAvatar = mounted ? user?.avatarUrl : undefined

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  React.useEffect(() => {
    if (mounted && user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
    }
  }, [mounted, user])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 900))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <SectionBlock icon={User} title="Perfil" description="Suas informações pessoais exibidas na plataforma.">
      <div className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="h-14 w-14 rounded-full object-cover shadow-sm" />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-lg font-bold select-none shadow-sm">
                {userInitials}
              </div>
            )}
            <button className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-white border border-gray-200 shadow flex items-center justify-center hover:bg-gray-50 transition-colors">
              <Camera className="h-3 w-3 text-gray-500" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{userName || '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">{userEmail}{userRole ? ` · ${userRole}` : ''}</p>
            <button className="mt-1 text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors">
              Alterar foto
            </button>
          </div>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-9" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Cargo / Função</Label>
          <Input placeholder="Ex: Gerente de Vendas" className="h-9" />
          <p className="text-xs text-gray-400">Visível para outros membros da equipe</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-400">{userEmail ? `Logado como ${userEmail}` : ''}</p>
          <Button size="sm" onClick={handleSave} disabled={saving || saved} className="min-w-[130px]">
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Salvando…</>
            ) : saved ? (
              <><Check className="h-3.5 w-3.5 mr-1.5" />Salvo!</>
            ) : (
              'Salvar alterações'
            )}
          </Button>
        </div>
      </div>
    </SectionBlock>
  )
}

/* ──────────────────── Locale ──────────────────── */
function LocaleSection() {
  return (
    <SectionBlock
      icon={Globe}
      title="Idioma e Região"
      description="Interface, fuso horário e formato de moeda."
    >
      <LocaleSettingsContent />
    </SectionBlock>
  )
}

/* ──────────────────── Notifications ──────────────────── */
const NOTIFICATION_GROUPS = [
  {
    label: 'Conversas',
    icon: MessageSquare,
    items: [
      {
        id: 'new_message',
        label: 'Nova mensagem recebida',
        description: 'Notificar quando uma nova mensagem chegar no inbox',
        defaultOn: true,
      },
      {
        id: 'assign',
        label: 'Conversa atribuída a mim',
        description: 'Quando uma conversa for direcionada ao meu usuário',
        defaultOn: true,
      },
    ],
  },
  {
    label: 'Sistema',
    icon: Smartphone,
    items: [
      {
        id: 'instance_dc',
        label: 'Instância desconectada',
        description: 'Alertar quando uma instância WhatsApp perder conexão',
        defaultOn: false,
      },
      {
        id: 'broadcast_done',
        label: 'Disparo em massa concluído',
        description: 'Notificar quando um disparo for finalizado',
        defaultOn: false,
      },
    ],
  },
]

function NotificationsSection() {
  const [states, setStates] = useState(() =>
    Object.fromEntries(
      NOTIFICATION_GROUPS.flatMap((g) => g.items).map((i) => [i.id, i.defaultOn]),
    ),
  )

  return (
    <SectionBlock icon={Bell} title="Notificações" description="Controle quando e como você é alertado.">
      <div className="space-y-6">
        {NOTIFICATION_GROUPS.map((group, gi) => {
          const GroupIcon = group.icon
          return (
            <div key={group.label}>
              {gi > 0 && <div className="h-px bg-gray-100 mb-6" />}
              <div className="flex items-center gap-1.5 mb-4">
                <GroupIcon className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{group.label}</span>
              </div>
              <div className="space-y-5">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                    </div>
                    <Switch
                      checked={states[item.id]}
                      onCheckedChange={() => setStates((s) => ({ ...s, [item.id]: !s[item.id] }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        <div className="h-px bg-gray-100" />

        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-100">
          <BellOff className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700">
            Notificações push por browser em breve. Por ora, apenas notificações dentro da plataforma estão ativas.
          </p>
        </div>
      </div>
    </SectionBlock>
  )
}

/* ──────────────────── Integrations ──────────────────── */
const INTEGRATIONS = [
  {
    name: 'n8n',
    description: 'Automações e fluxos de trabalho personalizados',
    logo: '⚙️',
    category: 'Automação',
  },
  {
    name: 'Google Calendar',
    description: 'Sincronize agendamentos com sua agenda',
    logo: '📅',
    category: 'Produtividade',
  },
  {
    name: 'Zapier',
    description: 'Conecte com mais de 5.000 aplicativos',
    logo: '⚡',
    category: 'Automação',
  },
  {
    name: 'Google Sheets',
    description: 'Exporte contatos e conversas para planilhas',
    logo: '📊',
    category: 'Produtividade',
  },
]

function IntegrationsSection() {
  return (
    <SectionBlock icon={Plug} title="Integrações" description="Conecte ferramentas externas para automatizar processos.">
      <div className="space-y-2">
        {INTEGRATIONS.map((integration, i) => (
          <div key={integration.name}>
            {i > 0 && <div className="h-px bg-gray-100 my-3" />}
            <div className="flex items-center justify-between gap-4 py-1">
              <div className="flex items-center gap-3.5">
                <div className="h-9 w-9 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-lg shrink-0">
                  {integration.logo}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{integration.name}</p>
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase tracking-wider">
                      {integration.category}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{integration.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors">
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <Button variant="outline" size="sm" className="text-xs h-7 gap-1 pr-2">
                  Conectar
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-gray-100 text-center">
        <p className="text-xs text-gray-400">
          Não encontrou o que procura?{' '}
          <button className="text-primary-600 hover:text-primary-700 font-medium">
            Sugira uma integração
          </button>
        </p>
      </div>
    </SectionBlock>
  )
}

/* ──────────────────── Danger Zone ──────────────────── */
function DangerSection() {
  return (
    <SectionBlock
      icon={AlertTriangle}
      title="Zona de Perigo"
      description="Ações permanentes e irreversíveis."
      danger
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Exportar dados</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Baixe uma cópia completa de todos os seus dados antes de excluir.
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50">
            Exportar dados
          </Button>
        </div>

        <div className="h-px bg-red-100" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-700">Excluir conta</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Remove permanentemente sua conta, dados, conversas e configurações.
            </p>
          </div>
          <Button variant="destructive" size="sm" className="shrink-0">
            Excluir conta
          </Button>
        </div>
      </div>
    </SectionBlock>
  )
}
