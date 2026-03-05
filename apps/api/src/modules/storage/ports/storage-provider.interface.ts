// Port — nunca muda. Trocar de provider = novo adapter, zero impacto no restante.

export interface IStorageProvider {
  /**
   * Faz upload de um arquivo e retorna a storage key (ex: tenants/abc/media/2024-03/uuid.jpg)
   */
  upload(key: string, buffer: Buffer, mimetype: string): Promise<void>

  /**
   * Retorna uma URL acessível pelo browser para o arquivo (pré-assinada ou pública)
   */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>

  /**
   * Remove o arquivo do storage
   */
  delete(key: string): Promise<void>
}
