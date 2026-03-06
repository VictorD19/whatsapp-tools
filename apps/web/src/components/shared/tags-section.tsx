'use client'

import React, { useMemo, useState } from 'react'
import { Tag, Plus, X, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { useTags, useContactTags, type Tag as TagType } from '@/hooks/use-tags'

interface TagsSectionProps {
  contactId: string
}

export function TagsSection({ contactId }: TagsSectionProps) {
  const { tags: allTags, isLoading: isLoadingTags, addTagToContact, removeTagFromContact } = useTags()
  const { contactTags, refetchContactTags } = useContactTags(contactId)
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false)

  const contactTagIds = useMemo(() => new Set(contactTags.map((t) => t.id)), [contactTags])

  const availableTags = useMemo(() => {
    return allTags.filter((t) => !contactTagIds.has(t.id))
  }, [allTags, contactTagIds])

  async function handleAddTag(tag: TagType) {
    const ok = await addTagToContact(contactId, tag.id)
    if (ok) {
      await refetchContactTags()
      setTagPopoverOpen(false)
    }
  }

  async function handleRemoveTag(tag: TagType) {
    const ok = await removeTagFromContact(contactId, tag.id)
    if (ok) {
      await refetchContactTags()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" />
          <span>Tags</span>
        </div>
        <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5">
              <Plus className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="end">
            <p className="text-xs font-medium text-muted-foreground mb-2 px-1">
              Adicionar tag
            </p>
            {isLoadingTags ? (
              <div className="flex justify-center py-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : availableTags.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 py-2">
                Nenhuma tag disponível
              </p>
            ) : (
              <div className="space-y-0.5 max-h-[200px] overflow-y-auto">
                {availableTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="truncate">{tag.name}</span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {contactTags.length > 0 ? (
          contactTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className="text-xs gap-1 pr-1"
              style={{
                backgroundColor: `${tag.color}20`,
                color: tag.color,
                borderColor: `${tag.color}40`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: tag.color }}
              />
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        ) : (
          <p className="text-[11px] text-muted-foreground/60">Nenhuma tag</p>
        )}
      </div>
    </div>
  )
}
