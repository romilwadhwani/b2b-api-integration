import 'dotenv/config';
import { createHash, randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function generateKey(): { raw: string; hashed: string } {
  const raw = `bk_live_${randomBytes(32).toString('hex')}`;
  const hashed = createHash('sha256').update(raw).digest('hex');
  return { raw, hashed };
}

async function main() {
  console.log('Seeding database...\n');

  await prisma.jobLog.deleteMany();
  await prisma.apiKey.deleteMany();

  const key1 = generateKey();
  const key2 = generateKey();

  const [apiKey1, apiKey2] = await Promise.all([
    prisma.apiKey.create({
      data: { name: 'Demo Caller — Production', hashedKey: key1.hashed },
    }),
    prisma.apiKey.create({
      data: { name: 'Demo Caller — Staging', hashedKey: key2.hashed },
    }),
  ]);

  console.log('Created API Keys:');
  console.log(`  [1] ${apiKey1.name}`);
  console.log(`      Raw key (save this): ${key1.raw}`);
  console.log(`  [2] ${apiKey2.name}`);
  console.log(`      Raw key (save this): ${key2.raw}\n`);

  const samplePayload = { userId: 'u_demo_123', email: 'demo@example.com' };

  await prisma.jobLog.createMany({
    data: [
      {
        apiKeyId: apiKey1.id,
        event: 'user.signup',
        payload: samplePayload,
        status: 'COMPLETED',
        attempts: 1,
        completedAt: new Date(),
      },
      {
        apiKeyId: apiKey1.id,
        event: 'order.placed',
        payload: { orderId: 'ord_001', amount: 149.99 },
        status: 'COMPLETED',
        attempts: 1,
        completedAt: new Date(),
      },
      {
        apiKeyId: apiKey2.id,
        event: 'payment.failed',
        payload: { orderId: 'ord_002', reason: 'insufficient_funds' },
        status: 'FAILED',
        attempts: 3,
        error: 'Slack API error: channel_not_found',
        completedAt: new Date(),
      },
      {
        apiKeyId: apiKey2.id,
        event: 'subscription.renewed',
        payload: { planId: 'pro', userId: 'u_456' },
        status: 'PROCESSING',
        attempts: 1,
      },
      {
        apiKeyId: apiKey1.id,
        event: 'user.deleted',
        payload: { userId: 'u_789' },
        status: 'QUEUED',
        attempts: 0,
      },
    ],
  });

  console.log('Created 5 JobLog records: 2 COMPLETED, 1 FAILED, 1 PROCESSING, 1 QUEUED');
  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
