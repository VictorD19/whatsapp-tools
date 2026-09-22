import { Injectable } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bull'
import { Queue } from 'bull'
import { QUEUES } from '@core/queue/queue.module'

export interface AiResponseJobData {
  conversationId: string
  tenantId: string
  instanceEvolutionId: string
  effectiveAssistantId: string
}

const JOB_NAME = 'process-ai-response'

@Injectable()
export class AiResponseProducer {
  constructor(
    @InjectQueue(QUEUES.AI_RESPONSE)
    private readonly queue: Queue,
  ) {}

  /**
   * Enfileira resposta da IA com debounce.
   * Se já existir job pendente para esta conversa, cancela e cria novo.
   * Isso garante que se o usuário mandar várias mensagens rápidas,
   * a IA só responde depois da última (waitTimeSeconds).
   */
  async enqueue(data: AiResponseJobData, delayMs: number): Promise<void> {
    const jobId = `ai-response:${data.conversationId}`

    // O Bull ignora silenciosamente um add() cujo jobId ainda exista no Redis,
    // entao o job anterior precisa sair daqui em qualquer estado. 'active' e o
    // unico em que remover nao e seguro: o worker esta processando.
    const existing = await this.queue.getJob(jobId)
    if (existing) {
      const state = await existing.getState()
      if (state !== 'active') {
        await existing.remove()
      }
    }

    await this.queue.add(JOB_NAME, data, {
      jobId,
      delay: delayMs,
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
      // Numeros aqui significam "quantos jobs manter", nao tempo.
      removeOnComplete: true,
      removeOnFail: 1000,
    })
  }
}
