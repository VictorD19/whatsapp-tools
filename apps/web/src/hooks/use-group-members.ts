import { useState, useCallback } from 'react'
import { apiGet } from '@/lib/api'

export interface GroupMember {
  id: string
  phone?: string
  name?: string
  admin: boolean
}

interface GroupMembersResponse {
  data: GroupMember[]
}

export function useGroupMembers() {
  const [members, setMembers] = useState<GroupMember[]>([])
  const [loading, setLoading] = useState(false)

  const fetchMembers = useCallback(async (conversationId: string) => {
    setLoading(true)
    try {
      const res = await apiGet<GroupMembersResponse>(
        `inbox/conversations/${conversationId}/group-members`,
      )
      setMembers(res.data)
    } catch {
      setMembers([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clearMembers = useCallback(() => {
    setMembers([])
  }, [])

  return { members, loading, fetchMembers, clearMembers }
}
