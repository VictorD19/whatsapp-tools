import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { PrismaService } from '@core/database/prisma.service'
import { LLM_PROVIDER } from '@modules/ai/ai.tokens'
import { StorageService } from '@modules/storage/storage.service'
import { KnowledgeBaseRepository } from '../knowledge-base.repository'
import type { KbIngestionJobData } from './kb-ingestion.producer'
import type { ILLMProvider } from '@modules/ai/ports/llm-provider.interface'

const CHUNK_SIZE = 500
const CHUNK_OVERLAP = 50

@Injectable()
export class KbIngestionProcessor implements OnModuleInit {
  constructor(
    @InjectQueue(QUEUES.KB_INGESTION)
    private readonly queue: Queue,
    private readonly repository: KnowledgeBaseRepository,
    @Inject(LLM_PROVIDER)
    private readonly llm: ILLMProvider,
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    await this.queue.isReady()
    this.queue.process('ingest-source', 1, (job: Job<KbIngestionJobData>) => {
      return this.handleIngestion(job)
    })
    this.logger.log('KB Ingestion worker registered', 'KbIngestionProcessor')
  }

  async handleIngestion(job: Job<KbIngestionJobData>) {
    const { sourceId, tenantId } = job.data

    const source = await this.repository.findSourceById(tenantId, sourceId)
    if (!source) {
      this.logger.error(`Source ${sourceId} not found`, undefined, 'KbIngestionProcessor')
      return
    }

    try {
      await this.repository.updateSourceStatus(sourceId, 'PROCESSING')

      // Busca API key do tenant
      const settings = await this.prisma.assistantSetting.findUnique({ where: { tenantId } })
      const apiKey = settings?.openaiApiKey ?? undefined

      const text = await this.extractText(source)
      if (!text || text.trim().length === 0) {
        throw new Error('Nenhum texto extraido da source')
      }

      const chunks = this.chunkText(text)

      await this.repository.deleteChunksBySource(sourceId)

      const chunkRecords: Array<{ content: string; embedding: number[]; chunkIndex: number }> = []
      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.llm.embed(chunks[i], apiKey)
        chunkRecords.push({
          content: chunks[i],
          embedding,
          chunkIndex: i,
        })
      }

      await this.repository.saveChunks(sourceId, tenantId, chunkRecords)
      await this.repository.updateSourceStatus(sourceId, 'COMPLETED')

      this.logger.log(
        `Source ${sourceId} ingested: ${chunkRecords.length} chunks`,
        'KbIngestionProcessor',
      )
    } catch (error) {
      const message = (error as Error).message ?? 'Erro desconhecido'
      this.logger.error(
        `Source ${sourceId} ingestion failed: ${message}`,
        (error as Error).stack,
        'KbIngestionProcessor',
      )
      await this.repository.updateSourceStatus(sourceId, 'FAILED', message.substring(0, 500))
    }
  }

  private async extractText(source: {
    type: string
    fileKey?: string | null
    fileMimeType?: string | null
    originalUrl?: string | null
    name: string
  }): Promise<string> {
    switch (source.type) {
      case 'FILE':
        return this.extractFromFile(source.fileKey!, source.fileMimeType!)

      case 'URL':
        return this.extractFromUrl(source.originalUrl!)

      case 'TEXT':
        return this.extractFromFile(source.fileKey!, 'text/plain')

      default:
        throw new Error(`Tipo de source nao suportado: ${source.type}`)
    }
  }

  private async extractFromFile(fileKey: string, mimetype: string): Promise<string> {
    const { buffer } = await this.storage.download(fileKey)

    if (mimetype === 'application/pdf') {
      const { PDFParse, VerbosityLevel } = require('pdf-parse')
      const parser = new PDFParse({ data: buffer, verbosity: VerbosityLevel.ERRORS })
      const result = await parser.getText()
      const text = result.pages.map((p: { text: string }) => p.text).join('\n\n')
      await parser.destroy()
      return text
    }

    if (
      mimetype === 'text/plain' ||
      mimetype === 'text/markdown' ||
      mimetype === 'text/csv'
    ) {
      return buffer.toString('utf-8')
    }

    return buffer.toString('utf-8')
  }

  private async extractFromUrl(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Falha ao buscar URL ${url}: ${response.status}`)
    }

    const html = await response.text()
    const cheerio = require('cheerio')
    const $ = cheerio.load(html)

    $('script, style, nav, footer, header, aside').remove()

    const textParts: string[] = []
    $('body p, body h1, body h2, body h3, body h4, body h5, body h6, body li, body td, body th, body blockquote, body pre').each(
      (_: number, el: any) => {
        const text = $(el).text().trim()
        if (text) textParts.push(text)
      },
    )

    return textParts.join('\n\n')
  }

  private chunkText(text: string): string[] {
    const chunks: string[] = []
    let start = 0

    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE, text.length)
      chunks.push(text.slice(start, end))

      if (end >= text.length) break
      start = end - CHUNK_OVERLAP
    }

    return chunks
  }
}
