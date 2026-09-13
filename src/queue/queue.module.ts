import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueService } from './queue.service';
import { QueueProcessor } from './queue.processor';
import { SlackModule } from '../slack/slack.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('UPSTASH_REDIS_HOST'),
          port: configService.get<number>('UPSTASH_REDIS_PORT'),
          password: configService.get<string>('UPSTASH_REDIS_PASSWORD'),
          tls: {},
        },
      }),
    }),
    BullModule.registerQueue({ name: 'slack-notifications' }),
    SlackModule,
  ],
  providers: [QueueService, QueueProcessor],
  exports: [QueueService],
})
export class QueueModule {}
