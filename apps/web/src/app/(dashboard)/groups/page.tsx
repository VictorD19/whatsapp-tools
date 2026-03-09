'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Users, Download, ListPlus, RefreshCw, Check, Loader2 } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { EmptyState } from '@/components/shared/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useInstances } from '@/hooks/use-instances'
import { useInstancesStore, type Instance } from '@/stores/instances.store'
import {
  useGroups,
  type ExtractProgress,
  type ExtractCompleted,
  type GroupMemberExtracted,
} from '@/hooks/use-groups'
import { useContactLists } from '@/hooks/use-contact-lists'
import { getSocket } from '@/lib/socket'
import { toast } from '@/components/ui/toaster'

type Step = 'select-instance' | 'select-groups' | 'extracting' | 'results'

export default function GroupsPage() {
  React.useEffect(() => { document.title = 'Grupos | SistemaZapChat' }, [])

  const { fetchInstances } = useInstances()
  const instances = useInstancesStore((s) => s.instances)
  const {
    groups,
    loading,
    extracting,
    fetchGroups,
    extractContacts,
    exportContacts,
    stopExtracting,
  } = useGroups()
  const { createList } = useContactLists()

  const [step, setStep] = useState<Step>('select-instance')
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>('')
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
  const [progress, setProgress] = useState<ExtractProgress | null>(null)
  const [extractedContacts, setExtractedContacts] = useState<GroupMemberExtracted[]>([])
  const [extractedContactIds, setExtractedContactIds] = useState<string[]>([])
  const [extractedListId, setExtractedListId] = useState<string | undefined>()

  // Create list dialog
  const [showCreateList, setShowCreateList] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [listName, setListName] = useState('')
  const [listDescription, setListDescription] = useState('')
  const [createListOnExtract, setCreateListOnExtract] = useState(false)

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  // Socket listeners for extraction progress
  useEffect(() => {
    const socket = getSocket()

    const handleProgress = (data: ExtractProgress) => {
      setProgress(data)
    }

    const handleCompleted = (data: ExtractCompleted) => {
      setExtractedContacts(data.contacts)
      setExtractedContactIds(data.contactIds ?? [])
      setExtractedListId(data.contactListId)
      stopExtracting()
      setStep('results')
    }

    socket.on('extract:progress', handleProgress)
    socket.on('extract:completed', handleCompleted)

    return () => {
      socket.off('extract:progress', handleProgress)
      socket.off('extract:completed', handleCompleted)
    }
  }, [stopExtracting])

  const connectedInstances = instances.filter((i) => i.status === 'CONNECTED')

  const handleSelectInstance = useCallback(
    (instanceId: string) => {
      setSelectedInstanceId(instanceId)
      setSelectedGroupIds(new Set())
      fetchGroups(instanceId)
      setStep('select-groups')
    },
    [fetchGroups],
  )

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    if (selectedGroupIds.size === groups.length) {
      setSelectedGroupIds(new Set())
    } else {
      setSelectedGroupIds(new Set(groups.map((g) => g.id)))
    }
  }, [groups, selectedGroupIds.size])

  const handleExtract = useCallback(async () => {
    if (selectedGroupIds.size === 0) return

    const createList = createListOnExtract && listName
      ? { name: listName, description: listDescription || undefined }
      : undefined

    setStep('extracting')
    setProgress(null)
    await extractContacts(selectedInstanceId, Array.from(selectedGroupIds), createList)
  }, [
    selectedGroupIds,
    selectedInstanceId,
    extractContacts,
    createListOnExtract,
    listName,
    listDescription,
  ])

  const handleExport = useCallback(
    (format: 'csv' | 'excel') => {
      if (extractedListId) {
        exportContacts(format, undefined, extractedListId)
        return
      }

      // No list ID — generate file client-side from in-memory data
      if (extractedContacts.length === 0) return

      const separator = format === 'csv' ? ',' : '\t'
      const header = `phone${separator}name${separator}group`
      const rows = extractedContacts.map(
        (c) =>
          `${c.phone}${separator}"${(c.name || '').replace(/"/g, '""')}"${separator}"${c.groupName.replace(/"/g, '""')}"`,
      )
      const content = [header, ...rows].join('\n')
      const ext = format === 'csv' ? 'csv' : 'xls'
      const mime = format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel'

      const blob = new Blob([content], { type: mime })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts-${Date.now()}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    [exportContacts, extractedListId, extractedContacts],
  )

  const handleCreateListFromResults = useCallback(() => {
    setShowCreateList(true)
  }, [])

  const resetFlow = useCallback(() => {
    setStep('select-instance')
    setSelectedInstanceId('')
    setSelectedGroupIds(new Set())
    setProgress(null)
    setExtractedContacts([])
    setExtractedContactIds([])
    setExtractedListId(undefined)
    setCreateListOnExtract(false)
    setListName('')
    setListDescription('')
  }, [])

  return (
    <PageLayout breadcrumb={[{ label: 'Marketing' }, { label: 'Grupos' }]}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Extração de Contatos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Extraia contatos de grupos WhatsApp para criar listas de disparo
          </p>
        </div>
        {step !== 'select-instance' && (
          <Button variant="outline" onClick={resetFlow}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Recomeçar
          </Button>
        )}
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 text-sm">
        <StepIndicator
          number={1}
          label="Instância"
          active={step === 'select-instance'}
          done={step !== 'select-instance'}
        />
        <div className="h-px w-8 bg-border" />
        <StepIndicator
          number={2}
          label="Grupos"
          active={step === 'select-groups'}
          done={step === 'extracting' || step === 'results'}
        />
        <div className="h-px w-8 bg-border" />
        <StepIndicator
          number={3}
          label="Extração"
          active={step === 'extracting'}
          done={step === 'results'}
        />
        <div className="h-px w-8 bg-border" />
        <StepIndicator number={4} label="Resultados" active={step === 'results'} done={false} />
      </div>

      {/* Step 1: Select Instance */}
      {step === 'select-instance' && (
        <div className="max-w-md space-y-4">
          <Label>Selecione a instância WhatsApp</Label>
          {connectedInstances.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhuma instância conectada"
              description="Conecte uma instância WhatsApp antes de extrair contatos"
            />
          ) : (
            <Select onValueChange={handleSelectInstance}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha uma instância..." />
              </SelectTrigger>
              <SelectContent>
                {connectedInstances.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.name} {inst.phone ? `(${inst.phone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Step 2: Select Groups */}
      {step === 'select-groups' && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando grupos...</span>
            </div>
          ) : groups.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum grupo encontrado"
              description="Esta instância não possui grupos"
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {groups.length} grupos encontrados — {selectedGroupIds.size} selecionados
                </p>
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {selectedGroupIds.size === groups.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              </div>

              <div className="rounded-md border border-border overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="w-12 px-4 py-3" />
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Grupo
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Membros
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {groups.map((group) => {
                      const selected = selectedGroupIds.has(group.id)
                      return (
                        <tr
                          key={group.id}
                          className={`cursor-pointer transition-colors ${selected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
                          onClick={() => toggleGroup(group.id)}
                        >
                          <td className="px-4 py-3">
                            <div
                              className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                                selected
                                  ? 'bg-primary border-primary text-primary-foreground'
                                  : 'border-input'
                              }`}
                            >
                              {selected && <Check className="h-3 w-3" />}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium">{group.name}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{group.size} membros</Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Create list option */}
              <div className="rounded-md border border-border p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-5 w-5 rounded border flex items-center justify-center cursor-pointer transition-colors ${
                      createListOnExtract
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-input'
                    }`}
                    onClick={() => setCreateListOnExtract(!createListOnExtract)}
                  >
                    {createListOnExtract && <Check className="h-3 w-3" />}
                  </div>
                  <Label
                    className="cursor-pointer"
                    onClick={() => setCreateListOnExtract(!createListOnExtract)}
                  >
                    Criar lista de contatos automaticamente
                  </Label>
                </div>
                {createListOnExtract && (
                  <div className="pl-8 space-y-2">
                    <Input
                      placeholder="Nome da lista (ex: Contatos VIP)"
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                    />
                    <Input
                      placeholder="Descrição (opcional)"
                      value={listDescription}
                      onChange={(e) => setListDescription(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleExtract}
                  disabled={
                    selectedGroupIds.size === 0 ||
                    (createListOnExtract && !listName.trim())
                  }
                >
                  <Users className="h-4 w-4 mr-2" />
                  Extrair contatos ({selectedGroupIds.size}{' '}
                  {selectedGroupIds.size === 1 ? 'grupo' : 'grupos'})
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 3: Extracting */}
      {step === 'extracting' && (
        <div className="max-w-md mx-auto space-y-4 text-center py-12">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Extraindo contatos...</h3>
          {progress && (
            <div className="space-y-2">
              <Progress value={progress.processed} max={progress.total} />
              <p className="text-sm text-muted-foreground">
                {progress.processed}/{progress.total} grupos processados
                — {progress.contactsSoFar} contatos encontrados
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Results */}
      {step === 'results' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">
                {extractedContacts.length} contatos extraídos
              </h3>
              {extractedListId && (
                <p className="text-sm text-emerald-600">
                  Lista de contatos criada com sucesso
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              {!extractedListId && (
                <Button
                  size="sm"
                  onClick={handleCreateListFromResults}
                  disabled={extractedContacts.length === 0}
                >
                  <ListPlus className="h-4 w-4 mr-2" />
                  Criar lista
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-md border border-border overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Telefone
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Nome
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Grupo de origem
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {extractedContacts.map((contact, idx) => (
                  <tr key={`${contact.phone}-${idx}`} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono">{contact.phone}</td>
                    <td className="px-4 py-3">{contact.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contact.groupName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create List Dialog (from results) */}
      <Dialog open={showCreateList} onOpenChange={setShowCreateList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar lista de contatos</DialogTitle>
            <DialogDescription>
              Salve os {extractedContacts.length} contatos extraídos em uma lista reutilizável
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome da lista</Label>
              <Input
                placeholder="Ex: Contatos de grupos VIP"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
              />
            </div>
            <div>
              <Label>Descrição (opcional)</Label>
              <Input
                placeholder="Descrição da lista"
                value={listDescription}
                onChange={(e) => setListDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateList(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!listName.trim() || creatingList}
              onClick={async () => {
                setCreatingList(true)
                try {
                  const phones = extractedContacts.map((c) => c.phone)
                  await createList(
                    listName.trim(),
                    extractedContactIds,
                    listDescription.trim() || undefined,
                    phones,
                  )
                  setExtractedListId('created')
                  setShowCreateList(false)
                  setListName('')
                  setListDescription('')
                } catch {
                  // toast is handled by the hook
                } finally {
                  setCreatingList(false)
                }
              }}
            >
              {creatingList ? 'Criando...' : 'Criar lista'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

function StepIndicator({
  number,
  label,
  active,
  done,
}: {
  number: number
  label: string
  active: boolean
  done: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
          done
            ? 'bg-emerald-500 text-white'
            : active
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {done ? <Check className="h-3.5 w-3.5" /> : number}
      </div>
      <span className={`text-sm ${active ? 'font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  )
}
