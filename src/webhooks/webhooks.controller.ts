import { Body, Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { ApiKey, Prisma } from '@prisma/client';
import { ApiKeyGuard } from '../common/guards/api-key.guard';
import { PrismaService } from '../database/prisma.service';
import { QueueService } from '../queue/queue.service';
import { TriggerEventDto } from './dto/trigger-event.dto';

@ApiTags('Webhooks')
@ApiSecurity('ApiKey')
@Controller('api/webhooks')
@UseGuards(ApiKeyGuard)
export class WebhooksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Post('trigger')
  @HttpCode(202)
  @ApiOperation({ summary: 'Trigger an event — queues async Slack notification, returns immediately' })
  @ApiResponse({ status: 202, description: 'Event queued successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Invalid, revoked, or expired API key' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
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
