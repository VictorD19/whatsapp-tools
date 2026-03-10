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
import { useTranslations } from 'next-intl'
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
    <section className="group py-2">
      {/* Section header */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
            danger
              ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400'
              : 'bg-primary/10 text-primary'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${danger ? 'text-red-700 dark:text-red-400' : 'text-foreground'}`}>
            {title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>

      {/* Section body — sem card, direto no card da página */}
      <div className="pl-11">
        {children}
      </div>
    </section>
  )
}

/* ──────────────────── Page ──────────────────── */
export default function SettingsPage() {
  const t = useTranslations('settings')
  React.useEffect(() => { document.title = `${t('title')} | SistemaZapChat` }, [t])
  return (
    <PageLayout breadcrumb={[{ label: t('title') }]}>
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>

        <ProfileSection />
        <div className="h-px bg-border" />
        <LocaleSection />
        <div className="h-px bg-border" />
        <NotificationsSection />
        <div className="h-px bg-border" />
        <IntegrationsSection />
        <div className="h-px bg-border" />
        <DangerSection />
    </PageLayout>
  )
}

/* ──────────────────── Profile ──────────────────── */
function ProfileSection() {
  const t = useTranslations('settings.profile')
  const ts = useTranslations('settings')
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
    <SectionBlock icon={User} title={t('title')} description={t('description')}>
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
            <button className="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-full bg-card border border-border shadow flex items-center justify-center hover:bg-muted transition-colors">
              <Camera className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{userName || '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{userEmail}{userRole ? ` · ${userRole}` : ''}</p>
            <button className="mt-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
              {t('changePhoto')}
            </button>
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('name')}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('email')}</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-9" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('role')}</Label>
          <Input placeholder={t('rolePlaceholder')} className="h-9" />
          <p className="text-xs text-muted-foreground">{t('roleHint')}</p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">{userEmail ? t('loggedAs', { email: userEmail }) : ''}</p>
          <Button size="sm" onClick={handleSave} disabled={saving || saved} className="min-w-[130px]">
            {saving ? (
              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{ts('saving')}</>
            ) : saved ? (
              <><Check className="h-3.5 w-3.5 mr-1.5" />{ts('saved')}</>
            ) : (
              ts('saveChanges')
            )}
          </Button>
        </div>
      </div>
    </SectionBlock>
  )
}

/* ──────────────────── Locale ──────────────────── */
function LocaleSection() {
  const t = useTranslations('settings.locale')
  return (
    <SectionBlock
      icon={Globe}
      title={t('title')}
      description={t('description')}
    >
      <LocaleSettingsContent />
    </SectionBlock>
  )
}

/* ──────────────────── Notifications ──────────────────── */
const NOTIFICATION_ITEMS = [
  { groupKey: 'conversations', groupIcon: MessageSquare, id: 'new_message', labelKey: 'newMessage', defaultOn: true },
  { groupKey: 'conversations', groupIcon: MessageSquare, id: 'assign', labelKey: 'conversationAssigned', defaultOn: true },
  { groupKey: 'system', groupIcon: Smartphone, id: 'instance_dc', labelKey: 'instanceDisconnected', defaultOn: false },
  { groupKey: 'system', groupIcon: Smartphone, id: 'broadcast_done', labelKey: 'broadcastCompleted', defaultOn: false },
]

function NotificationsSection() {
  const t = useTranslations('settings.notifications')
  const [states, setStates] = useState(() =>
    Object.fromEntries(NOTIFICATION_ITEMS.map((i) => [i.id, i.defaultOn])),
  )

  const groupLabels: Record<string, string> = {
    conversations: t('title'),
    system: t('title'),
  }

  const groups = NOTIFICATION_ITEMS.reduce<{ key: string; icon: typeof MessageSquare; items: typeof NOTIFICATION_ITEMS }[]>((acc, item) => {
    let group = acc.find((g) => g.key === item.groupKey)
    if (!group) {
      group = { key: item.groupKey, icon: item.groupIcon, items: [] }
      acc.push(group)
    }
    group.items.push(item)
    return acc
  }, [])

  return (
    <SectionBlock icon={Bell} title={t('title')} description={t('description')}>
      <div className="space-y-6">
        {groups.map((group, gi) => {
          const GroupIcon = group.icon
          return (
            <div key={group.key}>
              {gi > 0 && <div className="h-px bg-border mb-6" />}
              <div className="flex items-center gap-1.5 mb-4">
                <GroupIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.key}</span>
              </div>
              <div className="space-y-5">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t(item.labelKey)}</p>
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

        <div className="h-px bg-border" />

        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-amber-50 border border-amber-100 dark:bg-amber-950/30 dark:border-amber-900">
          <BellOff className="h-4 w-4 text-amber-500 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-400">
            {t('pushWarning')}
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
  const t = useTranslations('settings.integrations')
  return (
    <SectionBlock icon={Plug} title={t('title')} description={t('description')}>
      <div className="relative">
        {/* Overlay de bloqueio */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-background/80 backdrop-blur-[2px]">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted border border-border">
              <Plug className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">Em breve</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Integrações estarão disponíveis em uma versão futura.
            </p>
          </div>
        </div>

        {/* Conteúdo bloqueado (desfocado) */}
        <div className="pointer-events-none select-none opacity-40 space-y-2">
          {INTEGRATIONS.map((integration, i) => (
            <div key={integration.name}>
              {i > 0 && <div className="h-px bg-border my-3" />}
              <div className="flex items-center justify-between gap-4 py-1">
                <div className="flex items-center gap-3.5">
                  <div className="h-9 w-9 rounded-lg bg-muted border border-border flex items-center justify-center text-lg shrink-0">
                    {integration.logo}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">{integration.name}</p>
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
                        {integration.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{integration.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="p-1.5 text-muted-foreground/50">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                  <Button variant="outline" size="sm" className="text-xs h-7 gap-1 pr-2" disabled>
                    Conectar
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionBlock>
  )
}

/* ──────────────────── Danger Zone ──────────────────── */
function DangerSection() {
  const t = useTranslations('settings.danger')
  return (
    <SectionBlock
      icon={AlertTriangle}
      title={t('title')}
      description={t('description')}
      danger
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{t('exportData')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('exportDescription')}
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-950/30">
            {t('exportData')}
          </Button>
        </div>

        <div className="h-px bg-red-100 dark:bg-red-900" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{t('deleteAccount')}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('deleteDescription')}
            </p>
          </div>
          <Button variant="destructive" size="sm" className="shrink-0">
            {t('deleteAccount')}
          </Button>
        </div>
      </div>
    </SectionBlock>
  )
}
