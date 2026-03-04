import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { InstanceCard } from './instance-card'
import type { Instance, ImportProgress } from '@/stores/instances.store'

interface InstanceGridProps {
  instances: Instance[]
  isLoading: boolean
  importProgress: Record<string, ImportProgress>
  onConnect: (id: string) => void
  onDisconnect: (id: string) => void
  onDelete: (id: string) => void
  onImportConversations: (id: string) => void
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-5 w-20" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-8 w-full mt-4" />
      </CardContent>
    </Card>
  )
}

export function InstanceGrid({
  instances,
  isLoading,
  importProgress,
  onConnect,
  onDisconnect,
  onDelete,
  onImportConversations,
}: InstanceGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {instances.map((instance) => (
        <InstanceCard
          key={instance.id}
          instance={instance}
          importProgress={importProgress[instance.id]}
          onConnect={onConnect}
          onDisconnect={onDisconnect}
          onDelete={onDelete}
          onImportConversations={onImportConversations}
        />
      ))}
    </div>
  )
}
