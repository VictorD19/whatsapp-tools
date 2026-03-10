'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { Check, Radio, Users } from 'lucide-react'
import { Label } from '@/components/ui/label'
import type { ContactList } from '@/hooks/use-contact-lists'
import type { Instance } from '@/stores/instances.store'

interface StepSelectSourcesProps {
  instances: Instance[]
  contactLists: ContactList[]
  selectedInstanceIds: string[]
  selectedContactListIds: string[]
  onInstanceToggle: (id: string) => void
  onContactListToggle: (id: string) => void
}

export function StepSelectSources({
  instances,
  contactLists,
  selectedInstanceIds,
  selectedContactListIds,
  onInstanceToggle,
  onContactListToggle,
}: StepSelectSourcesProps) {
  const t = useTranslations('broadcasts.sources')
  const connectedInstances = instances.filter((i) => i.status === 'CONNECTED')

  return (
    <div className="space-y-6">
      {/* Instances */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('instancesLabel')}</Label>
        {connectedInstances.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('noConnectedInstances')}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {connectedInstances.map((inst) => {
              const selected = selectedInstanceIds.includes(inst.id)
              return (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => onInstanceToggle(inst.id)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-500/5 text-primary-600'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{inst.name}</p>
                    {inst.phone && (
                      <p className="text-xs text-muted-foreground">{inst.phone}</p>
                    )}
                  </div>
                  <Radio className="ml-auto h-3.5 w-3.5 text-green-500 shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Contact Lists */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">{t('contactListsLabel')}</Label>
        {contactLists.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('noListsCreated')}
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
            {contactLists.map((list) => {
              const selected = selectedContactListIds.includes(list.id)
              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => onContactListToggle(list.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                    selected
                      ? 'border-primary-500 bg-primary-500/5'
                      : 'border-border hover:bg-muted/50'
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-muted-foreground/30'
                    }`}
                  >
                    {selected && <Check className="h-3 w-3" />}
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-muted-foreground truncate">{list.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {list.contactCount} {t('contacts')}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary */}
      {(selectedInstanceIds.length > 0 || selectedContactListIds.length > 0) && (
        <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
          {t('summary', { instances: selectedInstanceIds.length, lists: selectedContactListIds.length })}
        </div>
      )}
    </div>
  )
}
