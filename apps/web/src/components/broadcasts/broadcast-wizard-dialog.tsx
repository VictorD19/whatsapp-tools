'use client'

import React, { useState, useCallback } from 'react'
import { Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { StepSelectSources } from './step-select-sources'
import { StepMessageContent } from './step-message-content'
import { StepConfig } from './step-config'
import type { BroadcastMessageType } from '@/hooks/use-broadcasts'
import type { ContactList } from '@/hooks/use-contact-lists'
import type { Instance } from '@/stores/instances.store'

interface BroadcastWizardDialogProps {
  open: boolean
  onClose: () => void
  instances: Instance[]
  contactLists: ContactList[]
  onSubmit: (data: BroadcastWizardData) => Promise<void>
}

export interface BroadcastWizardData {
  name: string
  instanceIds: string[]
  contactListIds: string[]
  groups: Array<{ jid: string; name?: string }>
  messageType: BroadcastMessageType
  messageTexts: string[]
  mediaUrl?: string
  caption?: string
  fileName?: string
  delay: number
  scheduledAt?: string
}

const steps = [
  { number: 1, label: 'Destinatarios' },
  { number: 2, label: 'Mensagem' },
  { number: 3, label: 'Configuracoes' },
]

export function BroadcastWizardDialog({
  open,
  onClose,
  instances,
  contactLists,
  onSubmit,
}: BroadcastWizardDialogProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  // Step 1 state
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<string[]>([])
  const [selectedContactListIds, setSelectedContactListIds] = useState<string[]>([])

  // Step 2 state
  const [messageType, setMessageType] = useState<BroadcastMessageType>('TEXT')
  const [messageTexts, setMessageTexts] = useState<string[]>([''])
  const [mediaUrl, setMediaUrl] = useState('')
  const [caption, setCaption] = useState('')
  const [fileName, setFileName] = useState('')

  // Step 3 state
  const [name, setName] = useState('')
  const [delay, setDelay] = useState(5)
  const [scheduledAt, setScheduledAt] = useState('')

  const totalEstimatedRecipients = contactLists
    .filter((l) => selectedContactListIds.includes(l.id))
    .reduce((sum, l) => sum + l.contactCount, 0)

  const toggleInstance = useCallback((id: string) => {
    setSelectedInstanceIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }, [])

  const toggleContactList = useCallback((id: string) => {
    setSelectedContactListIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    )
  }, [])

  const canProceedStep1 = selectedInstanceIds.length > 0 && selectedContactListIds.length > 0
  const canProceedStep2 =
    messageType === 'TEXT'
      ? messageTexts.some((t) => t.trim().length > 0)
      : mediaUrl.trim().length > 0
  const canProceedStep3 = name.trim().length > 0

  const handleClose = () => {
    setCurrentStep(1)
    setSelectedInstanceIds([])
    setSelectedContactListIds([])
    setMessageType('TEXT')
    setMessageTexts([''])
    setMediaUrl('')
    setCaption('')
    setFileName('')
    setName('')
    setDelay(5)
    setScheduledAt('')
    setSubmitting(false)
    onClose()
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const data: BroadcastWizardData = {
        name,
        instanceIds: selectedInstanceIds,
        contactListIds: selectedContactListIds,
        groups: [],
        messageType,
        messageTexts: messageTexts.filter((t) => t.trim().length > 0),
        mediaUrl: mediaUrl || undefined,
        caption: caption || undefined,
        fileName: fileName || undefined,
        delay,
      }

      if (scheduledAt) {
        // Convert local datetime to ISO with offset
        const localDate = new Date(scheduledAt)
        data.scheduledAt = localDate.toISOString()
      }

      await onSubmit(data)
      handleClose()
    } catch {
      // Error handled by hook via toast
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova campanha</DialogTitle>
          <DialogDescription>Configure e inicie um disparo em massa</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 py-2">
          {steps.map((step, idx) => (
            <React.Fragment key={step.number}>
              {idx > 0 && (
                <div
                  className={`h-px flex-1 ${
                    currentStep > step.number - 1 ? 'bg-primary-500' : 'bg-border'
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number)
                }}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  currentStep === step.number
                    ? 'bg-primary-500 text-white'
                    : currentStep > step.number
                      ? 'bg-primary-500/10 text-primary-600'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span>{step.number}</span>
                )}
                {step.label}
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="py-2">
          {currentStep === 1 && (
            <StepSelectSources
              instances={instances}
              contactLists={contactLists}
              selectedInstanceIds={selectedInstanceIds}
              selectedContactListIds={selectedContactListIds}
              onInstanceToggle={toggleInstance}
              onContactListToggle={toggleContactList}
            />
          )}
          {currentStep === 2 && (
            <StepMessageContent
              messageType={messageType}
              messageTexts={messageTexts}
              mediaUrl={mediaUrl}
              caption={caption}
              fileName={fileName}
              onMessageTypeChange={setMessageType}
              onMessageTextsChange={setMessageTexts}
              onMediaUrlChange={setMediaUrl}
              onCaptionChange={setCaption}
              onFileNameChange={setFileName}
            />
          )}
          {currentStep === 3 && (
            <StepConfig
              name={name}
              delay={delay}
              scheduledAt={scheduledAt}
              selectedInstanceCount={selectedInstanceIds.length}
              selectedContactListCount={selectedContactListIds.length}
              totalEstimatedRecipients={totalEstimatedRecipients}
              onNameChange={setName}
              onDelayChange={setDelay}
              onScheduledAtChange={setScheduledAt}
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep((s) => s - 1)}
              disabled={submitting}
            >
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          {currentStep < 3 ? (
            <Button
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={currentStep === 1 ? !canProceedStep1 : !canProceedStep2}
            >
              Proximo
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canProceedStep3 || submitting}>
              {submitting
                ? 'Criando...'
                : scheduledAt
                  ? 'Agendar campanha'
                  : 'Iniciar campanha'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
