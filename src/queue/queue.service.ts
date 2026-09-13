import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface SlackJobData {
  jobLogId: string;
  event: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('slack-notifications') private readonly queue: Queue,
  ) {}

  async addJob(data: SlackJobData) {
    return this.queue.add('send-slack-notification', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
