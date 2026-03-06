import { useState, useCallback } from 'react'
import { apiGet, apiPost, api } from '@/lib/api'
import { toast } from '@/components/ui/toaster'

export interface Group {
  id: string
  name: string
  size: number
}

export interface GroupMemberExtracted {
  phone: string
  name?: string
  groupName: string
}

interface GroupsResponse {
  data: Group[]
}

interface ExtractResult {
  data: {
    jobId: string
    message: string
  }
}

export interface ExtractProgress {
  processed: number
  total: number
  contactsSoFar: number
}

export interface ExtractCompleted {
  totalExtracted: number
  totalSaved: number
  contactListId?: string
  contactIds?: string[]
  contacts: GroupMemberExtracted[]
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)

  const fetchGroups = useCallback(async (instanceId: string) => {
    setLoading(true)
    try {
      const res = await apiGet<GroupsResponse>(`groups/instances/${instanceId}`)
      setGroups(res.data)
    } catch {
      toast({ title: 'Erro ao carregar grupos', variant: 'destructive' })
      setGroups([])
    } finally {
      setLoading(false)
    }
  }, [])

  const extractContacts = useCallback(
    async (
      instanceId: string,
      groupIds: string[],
      createList?: { name: string; description?: string },
    ) => {
      setExtracting(true)
      try {
        const res = await apiPost<ExtractResult>('groups/extract-contacts', {
          instanceId,
          groupIds,
          createList,
        })
        toast({ title: 'Extração iniciada', variant: 'success' })
        return res.data
      } catch {
        toast({ title: 'Erro ao iniciar extração', variant: 'destructive' })
        setExtracting(false)
        return null
      }
    },
    [],
  )

  const exportContacts = useCallback(
    async (
      format: 'csv' | 'excel',
      contactIds?: string[],
      contactListId?: string,
    ) => {
      try {
        const response = await api.post('contact-lists/export', {
          json: { format, contactIds, contactListId },
        })
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `contacts-${Date.now()}.${format === 'csv' ? 'csv' : 'xls'}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast({ title: 'Exportação concluída', variant: 'success' })
      } catch {
        toast({ title: 'Erro ao exportar contatos', variant: 'destructive' })
      }
    },
    [],
  )

  const stopExtracting = useCallback(() => {
    setExtracting(false)
  }, [])

  return {
    groups,
    loading,
    extracting,
    fetchGroups,
    extractContacts,
    exportContacts,
    stopExtracting,
  }
}
