import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'
import { IStorageProvider } from '../../ports/storage-provider.interface'

/**
 * MinIO adapter — implementa IStorageProvider usando o SDK S3-compatible.
 * Trocar para S3 ou R2 = criar novo adapter ou apenas ajustar as env vars.
 *
 * Para R2/S3: basta mudar MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY
 * e remover o forcePathStyle (R2/S3 usa virtual-hosted style).
 */
@Injectable()
export class MinioAdapter implements IStorageProvider {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly internalEndpoint: string
  private readonly publicUrl: string | undefined

  constructor(private readonly config: ConfigService) {
    this.internalEndpoint = config.getOrThrow<string>('MINIO_ENDPOINT')
    this.bucket = config.getOrThrow<string>('MINIO_BUCKET')
    this.publicUrl = config.get<string>('MINIO_PUBLIC_URL')

    this.client = new S3Client({
      endpoint: this.internalEndpoint,
      region: config.get<string>('MINIO_REGION') ?? 'us-east-1',
      credentials: {
        accessKeyId: config.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('MINIO_SECRET_KEY'),
      },
      // Necessário para MinIO — S3/R2 não precisam
      forcePathStyle: config.get<string>('MINIO_FORCE_PATH_STYLE') !== 'false',
      // Desabilita checksum automático — versões antigas do MinIO não suportam
      // x-amz-checksum-mode=ENABLED nas URLs presignadas e retornam 403
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
    })
  }

  async upload(key: string, buffer: Buffer, mimetype: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimetype,
        ContentLength: buffer.length,
      }),
    )
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    const signed = await getSignedUrl(this.client, command, { expiresIn })

    // Em Docker dev, o endpoint interno (minio:9000) não é acessível pelo browser.
    // Substituímos pelo MINIO_PUBLIC_URL (localhost:9000) para que o browser alcance.
    // Em S3/R2 não há essa distinção — MINIO_PUBLIC_URL não precisa ser definido.
    if (this.publicUrl) {
      return signed.replace(this.internalEndpoint, this.publicUrl)
    }

    return signed
  }

  async download(key: string): Promise<{ buffer: Buffer; contentType: string }> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    const stream = res.Body as Readable
    const chunks: Buffer[] = []
    await new Promise<void>((resolve, reject) => {
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))
      stream.on('end', resolve)
      stream.on('error', reject)
    })
    return {
      buffer: Buffer.concat(chunks),
      contentType: res.ContentType ?? 'application/octet-stream',
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    )
  }
}
