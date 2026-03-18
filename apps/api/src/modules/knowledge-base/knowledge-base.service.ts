import { Inject, Injectable } from '@nestjs/common'
import { AppException } from '@core/errors/app.exception'
import { LoggerService } from '@core/logger/logger.service'
import { StorageService } from '@modules/storage/storage.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'
import type { ILLMProvider } from '@modules/ai/ports/llm-provider.interface'
import { KnowledgeBaseRepository } from './knowledge-base.repository'
import { KbIngestionProducer } from './queues/kb-ingestion.producer'
import type { CreateKnowledgeBaseDto } from './dto/create-knowledge-base.dto'
import type { UpdateKnowledgeBaseDto } from './dto/update-knowledge-base.dto'
import type { AddSourceDto } from './dto/add-source.dto'

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly producer: KbIngestionProducer,
    private readonly storage: StorageService,
    @Inject(LLM_PROVIDER)
    private readonly llm: ILLMProvider,
    private readonly logger: LoggerService,
  ) {}

  async findAll(tenantId: string) {
    const items = await this.repository.findAll(tenantId)
    return { data: items }
  }

  async findById(tenantId: string, id: string) {
    const kb = await this.repository.findById(tenantId, id)
    if (!kb) {
      throw AppException.notFound('KNOWLEDGE_BASE_NOT_FOUND', 'Base de conhecimento nao encontrada')
    }
    return { data: kb }
  }

  async create(tenantId: string, dto: CreateKnowledgeBaseDto) {
    const kb = await this.repository.create(tenantId, dto)
    return { data: kb }
  }

  async update(tenantId: string, id: string, dto: UpdateKnowledgeBaseDto) {
    const kb = await this.repository.findById(tenantId, id)
    if (!kb) {
      throw AppException.notFound('KNOWLEDGE_BASE_NOT_FOUND', 'Base de conhecimento nao encontrada')
    }

    const updated = await this.repository.update(tenantId, id, dto)
    return { data: updated }
  }

  async delete(tenantId: string, id: string) {
    const kb = await this.repository.findById(tenantId, id)
    if (!kb) {
      throw AppException.notFound('KNOWLEDGE_BASE_NOT_FOUND', 'Base de conhecimento nao encontrada')
    }

    await this.repository.softDelete(tenantId, id)
    return { data: { deleted: true } }
  }

  async addFileSource(
    tenantId: string,
    kbId: string,
    file: { buffer: Buffer; mimetype: string; filename: string },
  ) {
    const kb = await this.repository.findById(tenantId, kbId)
    if (!kb) {
      throw AppException.notFound('KNOWLEDGE_BASE_NOT_FOUND', 'Base de conhecimento nao encontrada')
    }

    const fileKey = await this.storage.uploadMedia(tenantId, file.buffer, file.mimetype, file.filename)

    const source = await this.repository.createSource({
      knowledgeBaseId: kbId,
      tenantId,
      type: 'FILE',
      name: file.filename,
      fileKey,
      fileMimeType: file.mimetype,
    })

    await this.producer.enqueue({ sourceId: source.id, tenantId })

    this.logger.log(
      `KB source created: ${source.id} (FILE) for KB ${kbId}`,
      'KnowledgeBaseService',
    )

    return { data: source }
  }

  async addUrlSource(tenantId: string, kbId: string, dto: AddSourceDto) {
    const kb = await this.repository.findById(tenantId, kbId)
    if (!kb) {
      throw AppException.notFound('KNOWLEDGE_BASE_NOT_FOUND', 'Base de conhecimento nao encontrada')
    }

    const source = await this.repository.createSource({
      knowledgeBaseId: kbId,
      tenantId,
      type: 'URL',
      name: dto.name,
      originalUrl: dto.originalUrl,
    })

    await this.producer.enqueue({ sourceId: source.id, tenantId })

    this.logger.log(
      `KB source created: ${source.id} (URL) for KB ${kbId}`,
      'KnowledgeBaseService',
    )

    return { data: source }
  }

  async addTextSource(tenantId: string, kbId: string, dto: AddSourceDto) {
    const kb = await this.repository.findById(tenantId, kbId)
    if (!kb) {
      throw AppException.notFound('KNOWLEDGE_BASE_NOT_FOUND', 'Base de conhecimento nao encontrada')
    }

    const textBuffer = Buffer.from(dto.content ?? '', 'utf-8')
    const fileKey = await this.storage.uploadMedia(tenantId, textBuffer, 'text/plain', `${dto.name}.txt`)

    const source = await this.repository.createSource({
      knowledgeBaseId: kbId,
      tenantId,
      type: 'TEXT',
      name: dto.name,
      fileKey,
      fileMimeType: 'text/plain',
    })

    await this.producer.enqueue({ sourceId: source.id, tenantId })

    this.logger.log(
      `KB source created: ${source.id} (TEXT) for KB ${kbId}`,
      'KnowledgeBaseService',
    )

    return { data: source }
  }

  async deleteSource(tenantId: string, kbId: string, sourceId: string) {
    const source = await this.repository.findSourceById(tenantId, sourceId)
    if (!source) {
      throw AppException.notFound('KNOWLEDGE_SOURCE_NOT_FOUND', 'Fonte nao encontrada')
    }

    await this.repository.deleteChunksBySource(sourceId)
    await this.repository.deleteSource(tenantId, kbId, sourceId)

    return { data: { deleted: true } }
  }

  async reIngestSource(tenantId: string, kbId: string, sourceId: string) {
    const source = await this.repository.findSourceById(tenantId, sourceId)
    if (!source) {
      throw AppException.notFound('KNOWLEDGE_SOURCE_NOT_FOUND', 'Fonte nao encontrada')
    }

    if (source.status === 'PROCESSING') {
      throw new AppException(
        'KNOWLEDGE_SOURCE_REINGEST_INVALID_STATUS',
        'Source esta sendo processada, aguarde a conclusao',
      )
    }

    await this.repository.updateSourceStatus(sourceId, 'PENDING')
    await this.producer.enqueue({ sourceId, tenantId })

    this.logger.log(`KB source ${sourceId} queued for re-ingestion`, 'KnowledgeBaseService')

    return { data: { reIngested: true } }
  }

  async searchContext(tenantId: string, kbIds: string[], query: string, apiKey?: string) {
    this.logger.log(
      `[KB Search] Generating embedding for query: "${query.substring(0, 80)}"`,
      'KnowledgeBaseService',
    )
    const embedding = await this.llm.embed(query, apiKey)

    const chunks = await this.repository.searchSimilarChunks(tenantId, kbIds, embedding, 5)

    this.logger.log(
      `[KB Search] Found ${chunks.length} chunks — similarities: [${chunks.map((c) => c.similarity.toFixed(3)).join(', ')}]`,
      'KnowledgeBaseService',
    )

    const SIMILARITY_THRESHOLD = 0.5
    const filtered = chunks.filter((c) => c.similarity > SIMILARITY_THRESHOLD)

    this.logger.log(
      `[KB Search] ${filtered.length}/${chunks.length} chunks passed threshold (> ${SIMILARITY_THRESHOLD})`,
      'KnowledgeBaseService',
    )

    const context = filtered
      .map((c) => c.content)
      .join('\n\n---\n\n')

    return context
  }
}
