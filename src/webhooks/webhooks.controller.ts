import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { TriggerEventDto } from './dto/trigger-event.dto';
import { ApiKey, Prisma } from '@prisma/client';

@Controller('api/webhooks')
@UseGuards(ApiKeyGuard)
export class WebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Post('trigger')
  @HttpCode(202)
  async trigger(
    @Body() dto: TriggerEventDto,
    @Req() req: Request & { apiKey: ApiKey },
  ) {
    const jobLog = await this.prisma.jobLog.create({
      data: {
        event: dto.event,
        payload: dto.payload as Prisma.InputJsonValue,
        status: 'QUEUED',
        apiKeyId: req.apiKey.id,
      },
    });

    await this.queueService.addJob({
      jobLogId: jobLog.id,
      event: dto.event,
      payload: dto.payload,
    });

    return {
      message: 'Event queued successfully',
      jobId: jobLog.id,
      event: dto.event,
      queuedAt: jobLog.createdAt.toISOString(),
    };
  }
}
