import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

const REQUIRED_VARS = [
  'DATABASE_URL',
  // 'UPSTASH_REDIS_HOST',   // added in Phase 7
  // 'UPSTASH_REDIS_PORT',   // added in Phase 7
  // 'UPSTASH_REDIS_PASSWORD', // added in Phase 7
  // 'SLACK_BOT_TOKEN',      // added in Phase 8
  // 'SLACK_CHANNEL_ID',     // added in Phase 8
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
