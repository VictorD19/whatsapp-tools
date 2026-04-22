import { Processor, Process } from '@nestjs/bull'
import { QUEUES } from '@core/queue/queue.module'
import { LoggerService } from '@core/logger/logger.service'
import { PrismaService } from '@core/database/prisma.service'
import { WhatsAppService } from '@modules/whatsapp/whatsapp.service'
import { InboxRepository } from '@modules/inbox/inbox.repository'
import { InboxGateway } from '@modules/inbox/inbox.gateway'

interface InactivityRule {
    timeInSeconds: number
    actionType: 'interact' | 'close'
    message?: string
    allowExecutionAnyTime?: boolean
}

@Processor(QUEUES.INACTIVITY_SCANNER)
export class InactivityScannerProcessor {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: LoggerService,
        private readonly whatsapp: WhatsAppService,
        private readonly inboxRepository: InboxRepository,
        private readonly inboxGateway: InboxGateway,
    ) { }

    @Process('scan')
    async handle() {
        const instances = await this.prisma.instance.findMany({
            where: { status: 'CONNECTED' },
            select: {
                id: true,
                evolutionId: true,
                tenantId: true,
                inactivityFlowRules: true,
            },
        })

        for (const instance of instances) {
            const rules = instance.inactivityFlowRules as unknown as InactivityRule[]
            if (!Array.isArray(rules) || rules.length === 0) continue

            const conversations = await this.prisma.conversation.findMany({
                where: {
                    instanceId: instance.id,
                    status: 'OPEN',
                    lastMessageAt: { not: null },
                },
                select: {
                    id: true,
                    tenantId: true,
                    lastInactivityStep: true,
                    lastMessageAt: true,
                    contact: { select: { phone: true } },
                },
            })

            for (const conv of conversations) {
                const nextStepIndex = conv.lastInactivityStep !== null ? conv.lastInactivityStep + 1 : 0
                if (nextStepIndex >= rules.length) continue

                const rule = rules[nextStepIndex]

                // Check allowExecutionAnyTime — skip if outside business hours
                if (rule.allowExecutionAnyTime === false) {
                    const now = new Date()
                    const hour = now.getHours()
                    // Business hours: 8:00–18:00 (Mon-Fri)
                    const dayOfWeek = now.getDay()
                    const isBusinessDay = dayOfWeek >= 1 && dayOfWeek <= 5
                    const isBusinessHour = hour >= 8 && hour < 18
                    if (!isBusinessDay || !isBusinessHour) continue
                }

                const ruleTimeInMs = rule.timeInSeconds * 1000
                const timeSinceLastMessage = Date.now() - conv.lastMessageAt!.getTime()

                if (timeSinceLastMessage >= ruleTimeInMs) {
                    try {
                        await this.executeRule(rule, nextStepIndex, conv, instance)
                    } catch (e) {
                        this.logger.error(
                            `Error executing inactivity rule for conv ${conv.id}: ${(e as Error).message}`,
                            (e as Error).stack,
                            'InactivityScanner',
                        )
                    }
                }
            }
        }
    }

    private async executeRule(
        rule: InactivityRule,
        stepIndex: number,
        conv: { id: string; tenantId: string; lastInactivityStep: number | null; contact: { phone: string } },
        instance: { evolutionId: string; tenantId: string },
    ) {
        if (rule.actionType === 'interact' && rule.message) {
            const result = await this.whatsapp.sendText(instance.evolutionId, conv.contact.phone, rule.message)

            const message = await this.inboxRepository.createMessage({
                tenantId: conv.tenantId,
                conversationId: conv.id,
                fromMe: true,
                fromBot: true,
                body: rule.message,
                type: 'TEXT',
                status: 'SENT',
                evolutionId: result.messageId,
            })
            await this.inboxRepository.updateLastMessageAt(conv.id)

            // Emit WebSocket so frontend updates in real-time
            this.inboxGateway.emitNewMessage(conv.tenantId, {
                conversationId: conv.id,
                message: {
                    id: message.id,
                    conversationId: conv.id,
                    fromMe: true,
                    fromBot: true,
                    body: message.body,
                    type: message.type,
                    status: message.status,
                    mediaUrl: message.mediaUrl ?? null,
                    quotedMessageId: message.quotedMessageId ?? null,
                    quotedMessage: null,
                    sentAt: message.sentAt,
                    createdAt: message.createdAt,
                },
            })
        } else if (rule.actionType === 'close') {
            await this.inboxRepository.closeConversation(conv.tenantId, conv.id)

            // Emit WebSocket so frontend reflects the closed status
            this.inboxGateway.emitConversationClosed(conv.tenantId, {
                conversationId: conv.id,
            })
        }

        await this.prisma.conversation.update({
            where: { id: conv.id },
            data: {
                lastInactivityStep: stepIndex,
                lastInactivityAt: new Date(),
            },
        })

        this.logger.log(
            `Executed inactivity rule [${rule.actionType}] step=${stepIndex} for conv ${conv.id}`,
            'InactivityScanner',
        )
    }
}
