import { Injectable } from '@nestjs/common'
import { PrismaService } from '@core/database/prisma.service'
import type { IngestionStatus } from '@prisma/client'

@Injectable()
export class KnowledgeBaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        _count: { select: { sources: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.knowledgeBase.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        sources: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
  }

  async create(tenantId: string, data: { name: string; description?: string }) {
    return this.prisma.knowledgeBase.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
      },
    })
  }

  async update(tenantId: string, id: string, data: { name?: string; description?: string }) {
    return this.prisma.knowledgeBase.update({
      where: { id },
      data,
    })
  }

  async softDelete(tenantId: string, id: string) {
    return this.prisma.knowledgeBase.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async createSource(data: {
    knowledgeBaseId: string
    tenantId: string
    type: 'FILE' | 'URL' | 'TEXT'
    name: string
    originalUrl?: string
    fileKey?: string
    fileMimeType?: string
    content?: string
  }) {
    return this.prisma.knowledgeSource.create({
      data: {
        knowledgeBaseId: data.knowledgeBaseId,
        tenantId: data.tenantId,
        type: data.type,
        name: data.name,
        originalUrl: data.originalUrl,
        fileKey: data.fileKey,
        fileMimeType: data.fileMimeType,
        status: 'PENDING',
      },
    })
  }

  async updateSourceStatus(sourceId: string, status: IngestionStatus, errorMessage?: string) {
    return this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status, errorMessage: errorMessage ?? null },
    })
  }

  async deleteSource(tenantId: string, kbId: string, sourceId: string) {
    return this.prisma.knowledgeSource.delete({
      where: { id: sourceId },
    })
  }

  async findSourceById(tenantId: string, sourceId: string) {
    return this.prisma.knowledgeSource.findFirst({
      where: { id: sourceId, tenantId },
    })
  }

  async saveChunks(sourceId: string, tenantId: string, chunks: Array<{ content: string; embedding: number[]; chunkIndex: number }>) {
    for (const chunk of chunks) {
      const vectorStr = '[' + chunk.embedding.join(',') + ']'
      await this.prisma.$executeRaw`
        INSERT INTO "KnowledgeChunk" (id, "sourceId", "tenantId", content, embedding, "chunkIndex")
        VALUES (
          ${this.generateCuid()},
          ${sourceId},
          ${tenantId},
          ${chunk.content},
          ${vectorStr}::vector,
          ${chunk.chunkIndex}
        )
      `
    }
  }

  async deleteChunksBySource(sourceId: string) {
    return this.prisma.knowledgeChunk.deleteMany({
      where: { sourceId },
    })
  }

  async searchSimilarChunks(tenantId: string, kbIds: string[], embedding: number[], topK: number) {
    const vectorStr = '[' + embedding.join(',') + ']'
    const results = await this.prisma.$queryRaw<
      Array<{ id: string; content: string; sourceId: string; similarity: number }>
    >`
      SELECT id, content, "sourceId", 1 - (embedding <=> ${vectorStr}::vector) as similarity
      FROM "KnowledgeChunk"
      WHERE "tenantId" = ${tenantId}
      AND "sourceId" IN (
        SELECT id FROM "KnowledgeSource"
        WHERE "knowledgeBaseId" = ANY(${kbIds}::text[])
        AND status = 'COMPLETED'
      )
      ORDER BY embedding <=> ${vectorStr}::vector
      LIMIT ${topK}
    `
    return results
  }

  private generateCuid(): string {
    const { createId } = require('@paralleldrive/cuid2')
    return createId()
  }
}
