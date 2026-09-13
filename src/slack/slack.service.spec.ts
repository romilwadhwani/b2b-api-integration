import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { SlackService, SlackMessagePayload } from './slack.service';

const MOCK_PAYLOAD: SlackMessagePayload = {
  jobLogId: 'job1',
  event: 'user.signup',
  payload: { userId: 'u_123' },
  receivedAt: new Date().toISOString(),
};

describe('SlackService', () => {
  let service: SlackService;
  let httpService: { post: jest.Mock };

  beforeEach(async () => {
    httpService = { post: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackService,
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'SLACK_BOT_TOKEN' ? 'xoxb-test' : 'C_CHANNEL',
          },
        },
      ],
    }).compile();

    service = module.get<SlackService>(SlackService);
  });

  it('should resolve without error when Slack returns ok: true', async () => {
    httpService.post.mockReturnValue(of({ data: { ok: true } }));
    await expect(service.sendMessage(MOCK_PAYLOAD)).resolves.toBeUndefined();
  });

  it('should throw with a descriptive message when Slack returns ok: false', async () => {
    httpService.post.mockReturnValue(of({ data: { ok: false, error: 'channel_not_found' } }));
    await expect(service.sendMessage(MOCK_PAYLOAD)).rejects.toThrow('channel_not_found');
  });

  it('should throw when the HTTP request itself fails (network error)', async () => {
    httpService.post.mockReturnValue(throwError(() => new Error('Network timeout')));
    await expect(service.sendMessage(MOCK_PAYLOAD)).rejects.toThrow('Failed to send Slack message');
  });
});
