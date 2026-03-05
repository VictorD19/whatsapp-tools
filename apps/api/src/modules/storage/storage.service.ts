import { Inject, Injectable } from '@nestjs/common'
import { extname } from 'path'
import { randomUUID } from 'crypto'
import { IStorageProvider } from './ports/storage-provider.interface'

export const STORAGE_PROVIDER = 'STORAGE_PROVIDER'

/** Tipos de mídia que são persistidos no storage local. */
export const STORABLE_MEDIA_TYPES = new Set(['IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT'])

/** Retorna extensão de arquivo baseada no mimetype. */
function mimetypeToExt(mimetype: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/3gpp': '.3gp',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/wav': '.wav',
    'audio/webm': '.webm',
    'application/pdf': '.pdf',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
    'application/vnd.ms-powerpoint': '.ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
    'application/zip': '.zip',
    'application/x-rar-compressed': '.rar',
    'application/x-7z-compressed': '.7z',
    'text/plain': '.txt',
  }
  return map[mimetype] ?? extname(mimetype.split('/')[1] ?? 'bin') ?? '.bin'
}

/** Verifica se uma string é uma storage key local (começa com "tenants/") */
export function isStorageKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.startsWith('tenants/')
}

@Injectable()
export class StorageService {
  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly provider: IStorageProvider,
  ) {}

  /**
   * Faz upload de uma mídia e retorna a storage key.
   * Key format: tenants/{tenantId}/media/{YYYY-MM}/{uuid}.ext
   */
  async uploadMedia(
    tenantId: string,
    buffer: Buffer,
    mimetype: string,
    originalFilename?: string,
  ): Promise<string> {
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const ext = originalFilename ? extname(originalFilename) || mimetypeToExt(mimetype) : mimetypeToExt(mimetype)
    const key = `tenants/${tenantId}/media/${yearMonth}/${randomUUID()}${ext}`

    await this.provider.upload(key, buffer, mimetype)
    return key
  }

  /**
   * Retorna URL acessível pelo browser (pré-assinada ou pública).
   * Válida por 1 hora por padrão.
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.provider.getSignedUrl(key, expiresIn)
  }

  /**
   * Baixa o arquivo e retorna buffer + content-type para proxy server-side.
   * Evita redirecionar o browser para URLs presignadas (que falham com Range requests).
   */
  async download(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    return this.provider.download(key)
  }

  async delete(key: string): Promise<void> {
    return this.provider.delete(key)
  }
}
