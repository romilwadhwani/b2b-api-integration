import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

const REQUIRED_VARS = [
  'DATABASE_URL',
  'UPSTASH_REDIS_HOST',
  'UPSTASH_REDIS_PORT',
  'UPSTASH_REDIS_PASSWORD',
  'SLACK_BOT_TOKEN',
  'SLACK_CHANNEL_ID',
  'ADMIN_SECRET',
];

function validate(config: Record<string, unknown>): Record<string, unknown> {
  const missing = REQUIRED_VARS.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
})
export class AppConfigModule {}
