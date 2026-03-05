import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StorageService, STORAGE_PROVIDER } from './storage.service'
import { MinioAdapter } from './adapters/minio/minio.adapter'

/**
 * StorageModule — Ports & Adapters para armazenamento de arquivos.
 *
 * Trocar de MinIO para S3 ou R2:
 *   1. Criar novo adapter em adapters/s3/ ou adapters/r2/
 *   2. Trocar MinioAdapter por S3Adapter no provide abaixo
 *   3. Nenhum outro arquivo muda.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: MinioAdapter, // ← trocar aqui para S3Adapter ou R2Adapter
    },
    StorageService,
  ],
  exports: [StorageService],
})
export class StorageModule {}
