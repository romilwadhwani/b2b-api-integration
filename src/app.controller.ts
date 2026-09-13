import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller()
export class AppController {
  @SkipThrottle()
  @Get()
  @ApiOperation({ summary: 'Service intro' })
  @ApiResponse({ status: 200, description: 'Returns app name, version, and available endpoints' })
  index() {
    return {
      name: 'B2B API Integration Service',
      version: '1.0.0',
      description:
        'Production-ready webhook ingestion service with async job queuing, hashed API key auth, rate limiting, and Slack notifications.',
      docs: '/api',
      endpoints: {
        webhooks: 'POST /api/webhooks/trigger',
        apiKeys: 'POST|GET|DELETE /api/api-keys',
        jobs: 'GET /api/jobs',
        health: 'GET /health',
      },
      stack: ['NestJS 12', 'Prisma 7', 'BullMQ', 'Upstash Redis', 'Neon PostgreSQL', 'Slack API'],
    };
  }

  @SkipThrottle()
  @Get('health')
  @ApiOperation({ summary: 'Health check — used by Railway to confirm the service is running' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  health(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
