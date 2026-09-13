import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface SlackMessagePayload {
  jobLogId: string;
  event: string;
  payload: Record<string, unknown>;
  receivedAt: string;
}

interface SlackApiResponse {
  ok: boolean;
  error?: string;
}

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async sendMessage(data: SlackMessagePayload): Promise<void> {
    const token = this.configService.get<string>('SLACK_BOT_TOKEN');
    const channel = this.configService.get<string>('SLACK_CHANNEL_ID');

    const body = {
      channel,
      text: 'New event received',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Event:* \`${data.event}\`\n*Job ID:* \`${data.jobLogId}\`\n*Received:* ${data.receivedAt}`,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Payload:*\n\`\`\`${JSON.stringify(data.payload, null, 2)}\`\`\``,
          },
        },
      ],
    };

    try {
      const response = await firstValueFrom(
        this.httpService.post<SlackApiResponse>(
          'https://slack.com/api/chat.postMessage',
          body,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data.ok) {
        throw new Error(`Slack API error: ${response.data.error ?? 'unknown'}`);
      }

      this.logger.log(`Slack message sent for job ${data.jobLogId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to send Slack message: ${message}`);
    }
  }
}
