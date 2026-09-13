import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../database/prisma.service';
import { SlackJobData } from './queue.service';

@Processor('slack-notifications')
export class QueueProcessor extends WorkerHost {
  private readonly logger = new Logger(QueueProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<SlackJobData>): Promise<void> {
    const { jobLogId, event, payload } = job.data;

    await this.prisma.jobLog.update({
      where: { id: jobLogId },
      data: { status: 'PROCESSING', attempts: { increment: 1 } },
    });

    try {
      // SlackService injected in Phase 8 — placeholder call
      this.logger.log(`Processing job ${jobLogId} for event: ${event}`);
      this.logger.debug(`Payload: ${JSON.stringify(payload)}`);

      await this.prisma.jobLog.update({
        where: { id: jobLogId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });

      this.logger.log(`Job ${jobLogId} completed`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.jobLog.update({
        where: { id: jobLogId },
        data: { status: 'FAILED', error: message, completedAt: new Date() },
      });

      this.logger.error(`Job ${jobLogId} failed: ${message}`);
      throw error;
    }
  }
}
