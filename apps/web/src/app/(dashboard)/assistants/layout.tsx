'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

export default function AssistantsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user && user.role !== 'admin' && !user.isSuperAdmin) {
      router.replace('/inbox')
    }
  }, [user, router])

  if (!user || (user.role !== 'admin' && !user.isSuperAdmin)) {
    return null
  }

  return <>{children}</>
}
