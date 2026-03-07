'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Tag {
  id: string
  name: string
  color?: string
}

interface TagConfigProps {
  value: { tagIds: string[] }
  onChange: (config: { tagIds: string[] }) => void
}

export function TagConfig({ value, onChange }: TagConfigProps) {
  const { data: tags = [], isLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiGet<{ data: Tag[] }>('tags').then((r) => r.data),
  })

  const toggleTag = (tagId: string) => {
    const current = value.tagIds ?? []
    const next = current.includes(tagId)
      ? current.filter((id) => id !== tagId)
      : [...current, tagId]
    onChange({ tagIds: next })
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  if (tags.length === 0) {
    return (
      <div className="space-y-2">
        <Label>Tags</Label>
        <p className="text-sm text-muted-foreground">Nenhuma tag cadastrada. Crie tags em Configuracoes.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>Tags a aplicar</Label>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = (value.tagIds ?? []).includes(tag.id)
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggleTag(tag.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40',
              )}
            >
              {tag.color && (
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              )}
              {tag.name}
              {selected && <Check className="h-3 w-3" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
