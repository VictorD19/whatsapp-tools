'use client'

import React, { useRef, useState } from 'react'
import { Upload, Globe, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface AddSourceSectionProps {
  knowledgeBaseId: string
  onUploadFile: (formData: FormData) => Promise<void>
  onAddUrl: (data: { name: string; originalUrl: string }) => Promise<void>
  onAddText: (data: { name: string; content: string }) => Promise<void>
}

export function AddSourceSection({
  knowledgeBaseId,
  onUploadFile,
  onAddUrl,
  onAddText,
}: AddSourceSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [addingUrl, setAddingUrl] = useState(false)
  const [addingText, setAddingText] = useState(false)

  // URL form state
  const [urlName, setUrlName] = useState('')
  const [urlValue, setUrlValue] = useState('')

  // Text form state
  const [textName, setTextName] = useState('')
  const [textContent, setTextContent] = useState('')

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      await onUploadFile(formData)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleAddUrl = async () => {
    if (!urlName.trim() || !urlValue.trim()) return
    setAddingUrl(true)
    try {
      await onAddUrl({ name: urlName.trim(), originalUrl: urlValue.trim() })
      setUrlName('')
      setUrlValue('')
    } finally {
      setAddingUrl(false)
    }
  }

  const handleAddText = async () => {
    if (!textName.trim() || !textContent.trim()) return
    setAddingText(true)
    try {
      await onAddText({ name: textName.trim(), content: textContent.trim() })
      setTextName('')
      setTextContent('')
    } finally {
      setAddingText(false)
    }
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Adicionar fonte</h3>
      <Tabs defaultValue="file">
        <TabsList>
          <TabsTrigger value="file" className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Arquivo
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            URL
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-1.5">
            <Type className="h-3.5 w-3.5" />
            Texto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file">
          <div className="flex items-center gap-3 pt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileChange}
              className="sr-only"
              id={`file-upload-${knowledgeBaseId}`}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? 'Enviando...' : 'Selecionar arquivo'}
            </Button>
            <span className="text-xs text-muted-foreground">PDF, DOCX, TXT ou MD</span>
          </div>
        </TabsContent>

        <TabsContent value="url">
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-url-name">Nome</Label>
              <Input
                id="source-url-name"
                value={urlName}
                onChange={(e) => setUrlName(e.target.value)}
                placeholder="Ex: Documentacao do produto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-url">URL</Label>
              <Input
                id="source-url"
                type="url"
                value={urlValue}
                onChange={(e) => setUrlValue(e.target.value)}
                placeholder="https://exemplo.com/pagina"
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddUrl}
              disabled={addingUrl || !urlName.trim() || !urlValue.trim()}
            >
              {addingUrl ? 'Adicionando...' : 'Adicionar URL'}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="text">
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="source-text-name">Nome</Label>
              <Input
                id="source-text-name"
                value={textName}
                onChange={(e) => setTextName(e.target.value)}
                placeholder="Ex: FAQ do produto"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source-text-content">Conteudo</Label>
              <Textarea
                id="source-text-content"
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Cole o conteudo textual aqui..."
                rows={5}
              />
            </div>
            <Button
              size="sm"
              onClick={handleAddText}
              disabled={addingText || !textName.trim() || !textContent.trim()}
            >
              {addingText ? 'Adicionando...' : 'Adicionar texto'}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
