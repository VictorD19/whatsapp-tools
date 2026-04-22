import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUES } from '@core/queue/queue.module';
import { InactivityScannerProcessor } from './inactivity-scanner.processor';
import { InboxModule } from '../inbox/inbox.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

@Module({
    imports: [
        BullModule.registerQueue({ name: QUEUES.INACTIVITY_SCANNER }),
        InboxModule,
        WhatsAppModule,
    ],
    providers: [InactivityScannerProcessor],
})
export class InactivityScannerModule implements OnModuleInit {
    constructor(
        @InjectQueue(QUEUES.INACTIVITY_SCANNER) private readonly queue: Queue,
    ) { }

    async onModuleInit() {
        const repeatableJobs = await this.queue.getRepeatableJobs();
        for (const job of repeatableJobs) {
            await this.queue.removeRepeatableByKey(job.key);
        }

        // Check inactivity every 1 minute
        await this.queue.add('scan', {}, {
            repeat: {
                every: 60000,
            },
            removeOnComplete: true,
            removeOnFail: true,
        });
    }
}
