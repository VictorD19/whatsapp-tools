import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

@Injectable()
export class AesCryptoService {
  private readonly encryptionKey: Buffer

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('ENCRYPTION_KEY', '')
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters')
    }
    this.encryptionKey = Buffer.from(key, 'utf-8')
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return Buffer.concat([iv, authTag, encrypted]).toString('base64url')
  }

  decrypt(ciphertext: string): string {
    const data = Buffer.from(ciphertext, 'base64url')
    const iv = data.subarray(0, 12)
    const authTag = data.subarray(12, 28)
    const encrypted = data.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv)
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted) + decipher.final('utf-8')
  }
}
