'use client'

import React, { useCallback, useRef, useState } from 'react'
import { Upload, FileText, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CsvRow {
  phone: string
  name?: string
}

interface CsvUploadTabProps {
  onDataChange: (file: File | null, rows: CsvRow[]) => void
}

const PHONE_HEADERS = ['phone', 'telefone', 'numero', 'número', 'celular']
const NAME_HEADERS = ['name', 'nome', 'nombre']

function parseCsvContent(content: string): { rows: CsvRow[]; error?: string } {
  const lines = content.trim().split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], error: 'Arquivo vazio ou sem dados' }

  const headerLine = lines[0].toLowerCase().trim()
  const separator = headerLine.includes(';') ? ';' : ','
  const headers = headerLine.split(separator).map((h) => h.trim().replace(/^["']|["']$/g, ''))

  const phoneIdx = headers.findIndex((h) => PHONE_HEADERS.includes(h))
  if (phoneIdx === -1) {
    return { rows: [], error: `Coluna "phone" nao encontrada. Aceitos: ${PHONE_HEADERS.join(', ')}` }
  }

  const nameIdx = headers.findIndex((h) => NAME_HEADERS.includes(h))
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], separator)
    const phone = (cols[phoneIdx] || '').replace(/\D/g, '').trim()
    if (!phone || phone.length < 8) continue
    const name = nameIdx >= 0 ? (cols[nameIdx] || '').trim() : undefined
    rows.push({ phone, name: name || undefined })
  }

  return { rows }
}

function parseCsvLine(line: string, separator: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

export function CsvUploadTab({ onDataChange }: CsvUploadTabProps) {
  const [file, setFile] = useState<File | null>(null)
  const [rows, setRows] = useState<CsvRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (f: File) => {
      setError(null)
      const text = await f.text()
      const { rows: parsed, error: parseError } = parseCsvContent(text)

      if (parseError) {
        setError(parseError)
        setFile(null)
        setRows([])
        onDataChange(null, [])
        return
      }

      if (parsed.length === 0) {
        setError('Nenhum contato valido encontrado no arquivo')
        setFile(null)
        setRows([])
        onDataChange(null, [])
        return
      }

      setFile(f)
      setRows(parsed)
      onDataChange(f, parsed)
    },
    [onDataChange],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (f) processFile(f)
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const f = e.dataTransfer.files[0]
      if (f) processFile(f)
    },
    [processFile],
  )

  const handleRemove = useCallback(() => {
    setFile(null)
    setRows([])
    setError(null)
    onDataChange(null, [])
    if (inputRef.current) inputRef.current.value = ''
  }, [onDataChange])

  return (
    <div className="space-y-4">
      {!file ? (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
            dragging
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50',
          )}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Arraste um arquivo CSV ou clique para selecionar</p>
          <p className="text-xs text-muted-foreground mt-1">
            Aceita .csv e .txt com colunas: phone, name
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt"
            className="sr-only"
            onChange={handleFileSelect}
          />
        </div>
      ) : (
        <div className="space-y-3">
          {/* File info */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{file.name}</span>
              <span className="text-xs text-muted-foreground">
                ({rows.length} contato{rows.length !== 1 ? 's' : ''})
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Preview table */}
          <div className="rounded-md border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Telefone
                  </th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                    Nome
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 text-xs font-mono">{row.phone}</td>
                    <td className="px-3 py-2 text-xs">{row.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 5 && (
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t border-border">
                ... e mais {rows.length - 5} contato{rows.length - 5 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
