'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Markdown } from 'tiptap-markdown'
import { useEffect, useCallback, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  CodeSquare,
  Undo,
  Redo,
  Wrench,
  ChevronRight,
} from 'lucide-react'
import { Separator } from './separator'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

export interface SlashCommandItem {
  id: string
  label: string
  icon?: React.ReactNode
  description?: string
  items?: { id: string; label: string; description?: string }[]
  onSelect?: (item: { id: string; label: string; description?: string }) => string
}

interface RichTextEditorProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  className?: string
  minHeight?: string
  slashCommands?: SlashCommandItem[]
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'h-7 w-7 p-0',
            active && 'bg-muted text-foreground',
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {title}
      </TooltipContent>
    </Tooltip>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive('strike')}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive('code')}
        title="Inline code"
      >
        <Code className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive('heading', { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        title="Bullet list"
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        title="Ordered list"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive('blockquote')}
        title="Blockquote"
      >
        <Quote className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive('codeBlock')}
        title="Code block"
      >
        <CodeSquare className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal rule"
      >
        <Minus className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="mx-1 h-5" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}

type SubItem = { id: string; label: string; description?: string }

function SlashCommandMenu({
  editor,
  commands,
  onClose,
}: {
  editor: Editor
  commands: SlashCommandItem[]
  onClose: () => void
}) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [activeCategory, setActiveCategory] = useState<SlashCommandItem | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const slashPosRef = useRef<number>(-1)

  useEffect(() => {
    const { from } = editor.state.selection
    // Store the exact position of the "/" character (one before cursor)
    slashPosRef.current = from - 1
    const coords = editor.view.coordsAtPos(from)
    const editorDom = editor.view.dom.closest('.rich-text-editor-wrapper')
    if (editorDom) {
      const rect = editorDom.getBoundingClientRect()
      setPosition({
        top: coords.bottom - rect.top + 4,
        left: coords.left - rect.left,
      })
    }
  }, [editor])

  const currentItems: Array<SlashCommandItem | SubItem> = activeCategory?.items ?? commands

  useEffect(() => {
    setSelectedIndex(0)
  }, [activeCategory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % currentItems.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + currentItems.length) % currentItems.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = currentItems[selectedIndex]
        if (item) handleSelect(item)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        if (activeCategory) {
          setActiveCategory(null)
        } else {
          onClose()
        }
      } else if (e.key === 'Backspace') {
        const { from } = editor.state.selection
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from)
        if (textBefore !== '/') {
          onClose()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [currentItems, selectedIndex, activeCategory, editor, onClose])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const handleSelect = (item: SlashCommandItem | SubItem) => {
    if ('items' in item && (item as SlashCommandItem).items) {
      setActiveCategory(item as SlashCommandItem)
      return
    }

    const label = item.label
    const slashPos = slashPosRef.current
    const { from } = editor.state.selection

    if (slashPos >= 0 && slashPos < editor.state.doc.content.size) {
      editor
        .chain()
        .focus()
        .deleteRange({ from: slashPos, to: from })
        .insertContent({
          type: 'text',
          marks: [{ type: 'code' }],
          text: label,
        })
        .unsetCode()
        .insertContent({ type: 'text', text: ' ' })
        .run()
    }

    onClose()
  }

  if (!position) return null

  return (
    <div
      ref={menuRef}
      className="absolute z-50 w-64 rounded-lg border bg-popover shadow-lg overflow-hidden"
      style={{ top: position.top, left: Math.min(position.left, 200) }}
    >
      {activeCategory && (
        <div className="flex items-center gap-1 px-3 py-2 border-b bg-muted/50">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setActiveCategory(null)}
          >
            /
          </button>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">{activeCategory.label}</span>
        </div>
      )}
      <div className="max-h-48 overflow-y-auto py-1">
        {currentItems.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            {activeCategory?.description ?? ''}
          </div>
        ) : (
          currentItems.map((item, index) => {
            const isCategory = 'items' in item && (item as SlashCommandItem).items
            return (
              <button
                key={item.id}
                type="button"
                className={cn(
                  'flex items-center gap-2 w-full px-3 py-2 text-left text-sm transition-colors',
                  index === selectedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent/50',
                )}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                {'icon' in item && (item as SlashCommandItem).icon ? (
                  <span className="shrink-0">{(item as SlashCommandItem).icon}</span>
                ) : (
                  <Wrench className="h-4 w-4 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{item.label}</span>
                </div>
                {isCategory && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  minHeight = '500px',
  slashCommands,
}: RichTextEditorProps) {
  const [showSlashMenu, setShowSlashMenu] = useState(false)

  const handleUpdate = useCallback(
    ({ editor }: { editor: Editor }) => {
      const md = editor.storage.markdown.getMarkdown()
      onChange(md)
    },
    [onChange],
  )

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Markdown.configure({
        html: false,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    ],
    content: value,
    onUpdate: handleUpdate,
    editorProps: {
      handleKeyDown: (view, event) => {
        if (event.key === '/' && slashCommands && slashCommands.length > 0) {
          setTimeout(() => setShowSlashMenu(true), 0)
          return false
        }

        // Delete entire code mark block on Backspace/Delete
        if (event.key === 'Backspace' || event.key === 'Delete') {
          const { state } = view
          const { from } = state.selection
          const $pos = state.doc.resolve(from)
          const codeMark = state.schema.marks.code
          if (!codeMark) return false

          // Check if cursor is inside or at the edge of a code mark
          const checkPos = event.key === 'Backspace' ? Math.max(0, from - 1) : from
          const $check = state.doc.resolve(checkPos)
          const marks = $check.marks()
          const hasCode = marks.some((m) => m.type === codeMark)

          if (hasCode) {
            // Find the full range of the code mark
            const parent = $pos.parent
            const parentOffset = $pos.start()
            let codeStart = 0
            let codeEnd = 0
            let found = false

            parent.forEach((node, offset) => {
              if (found) return
              if (node.isText && node.marks.some((m) => m.type === codeMark)) {
                const nodeStart = parentOffset + offset
                const nodeEnd = nodeStart + node.nodeSize
                if (checkPos >= nodeStart && checkPos < nodeEnd) {
                  codeStart = nodeStart
                  codeEnd = nodeEnd
                  found = true
                }
              }
            })

            if (found && codeEnd > codeStart) {
              event.preventDefault()
              const tr = state.tr.delete(codeStart, codeEnd)
              view.dispatch(tr)
              return true
            }
          }
        }

        return false
      },
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-3',
          'prose-headings:font-semibold prose-headings:tracking-tight',
          'prose-h1:text-xl prose-h2:text-lg prose-h3:text-base',
          'prose-p:leading-relaxed prose-p:my-1.5',
          'prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5',
          'prose-blockquote:border-l-2 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-muted-foreground',
          'prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-sm prose-code:font-mono',
          'prose-pre:rounded-lg prose-pre:bg-muted prose-pre:p-4',
        ),
        style: `min-height: ${minHeight}`,
      },
    },
  })

  // Sync external value changes (e.g. when loading existing assistant data)
  useEffect(() => {
    if (editor && value !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div className={cn('rounded-lg border bg-background overflow-hidden rich-text-editor-wrapper relative', className)}>
      <style>{`.rich-text-editor-wrapper code { background: hsl(var(--primary) / 0.1); color: hsl(var(--primary)); font-family: inherit; font-weight: 600; }`}</style>
      <Toolbar editor={editor} />
      <div className="overflow-y-auto relative" style={{ maxHeight: '70vh' }}>
        <EditorContent editor={editor} />
        {showSlashMenu && slashCommands && slashCommands.length > 0 && (
          <SlashCommandMenu
            editor={editor}
            commands={slashCommands}
            onClose={() => setShowSlashMenu(false)}
          />
        )}
      </div>
    </div>
  )
}
