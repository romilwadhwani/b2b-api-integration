# B2B API Integration Service

A production-ready NestJS service demonstrating async webhook ingestion, BullMQ job queuing, API key authentication, rate limiting, and Slack notification delivery — built as a portfolio piece showcasing enterprise backend patterns.

**Live:** https://b2b-api-integration-production.up.railway.app/  
**Docs:** https://b2b-api-integration-production.up.railway.app/api
**Health:** https://b2b-api-integration-production.up.railway.app/health

---

## What it does

External B2B partners call a single webhook endpoint with an event payload. The service:

1. Authenticates the caller via a hashed API key
2. Persists a `JobLog` record (status: `QUEUED`)
3. Enqueues a BullMQ job backed by Upstash Redis
4. A background worker picks up the job, posts a formatted Slack notification, and marks the log `COMPLETED` (or `FAILED` on error)

Admin endpoints let you manage API keys and query job history — all protected by a separate Bearer token guard.

---

## Architecture

```
HTTP Request
     │
     ▼
┌─────────────────────────────────────────┐
│  NestJS App                             │
│                                         │
│  ThrottlerGuard (global, 20 req/min)    │
│         │                               │
│  POST /api/webhooks/trigger             │
│         │                               │
│  ApiKeyGuard  ──── SHA-256 lookup ────► PrismaService (pg pool → Neon)
│         │                               │
│  WebhooksService                        │
│    ├─ Creates JobLog (QUEUED)           │
│    └─ Enqueues job ──────────────────► BullMQ (Upstash Redis / TLS)
│                                         │        │
│  POST /api/api-keys  ◄── AdminGuard     │        ▼
│  GET  /api/jobs      ◄── AdminGuard     │  QueueProcessor
│                                         │    ├─ Sets PROCESSING
│                                         │    ├─ SlackService ──► Slack API
│                                         │    └─ Sets COMPLETED / FAILED
└─────────────────────────────────────────┘
```

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | NestJS 12 (TypeScript, ESM) |
| Database | PostgreSQL via Neon (serverless) |
| ORM | Prisma 7 with `@prisma/adapter-pg` |
| Job queue | BullMQ + `@nestjs/bullmq` |
| Redis | Upstash Redis (TLS) via ioredis |
| HTTP client | `@nestjs/axios` (HttpService) |
| Notifications | Slack Web API (blocks format) |
| Auth | SHA-256 hashed API keys + Bearer admin token |
| Rate limiting | `@nestjs/throttler` (global guard) |
| Validation | `class-validator` + `class-transformer` |
| API docs | Swagger / OpenAPI (`@nestjs/swagger`) |
| Testing | Jest 30 (ESM mode via `--experimental-vm-modules`) + ts-jest |

---

## Key design decisions

**API keys stored as hashes only** — the raw key is returned once at creation and never stored. Every incoming request hashes the provided key with SHA-256 and looks up the result, so a database breach exposes no usable keys.

**Fire-and-forget `lastUsedAt`** — the guard resolves `canActivate` immediately after finding a valid key, then updates `lastUsedAt` in the background without awaiting. This keeps auth latency tight regardless of DB write speed.

**Prisma 7 adapter pattern** — Prisma 7 removed direct URL config from `schema.prisma`. The CLI uses `prisma.config.ts` (unpooled URL for migrations), while the runtime `PrismaService` uses a `pg.Pool` with the pooled URL via `PrismaPg` adapter.

**BullMQ over Upstash with mandatory TLS** — Upstash Redis requires `tls: {}` in the ioredis connection config; omitting it causes silent connection failures on the managed Redis endpoint.

**ESM Jest** — NestJS 12 ships packages as ESM. Tests run with `node --experimental-vm-modules` and ts-jest's `useESM: true` to avoid CJS/ESM boundary errors without transpiling to a legacy module system.

---

## Getting started

### Prerequisites

- Node.js ≥ 22
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- An [Upstash](https://upstash.com) Redis instance (free tier works)
- A Slack bot token with `chat:write` scope and a target channel ID

### Install

```bash
npm install
```

### Environment variables

Create a `.env` file at the project root:

```env
DATABASE_URL=postgresql://<user>:<password>@<pooled-host>/<db>?sslmode=require
DATABASE_URL_UNPOOLED=postgresql://<user>:<password>@<unpooled-host>/<db>?sslmode=require

UPSTASH_REDIS_HOST=<host>.upstash.io
UPSTASH_REDIS_PORT=6379
UPSTASH_REDIS_PASSWORD=<password>

SLACK_BOT_TOKEN=xoxb-...
SLACK_CHANNEL_ID=C...

ADMIN_SECRET=<any strong secret>
PORT=3000
NODE_ENV=development
THROTTLE_TTL=60
THROTTLE_LIMIT=20
```

> `DATABASE_URL` is used at runtime (pooled connection). `DATABASE_URL_UNPOOLED` is used by Prisma CLI for migrations.

### Database setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### Seed demo data

```bash
npm run seed
```

This creates 2 demo API keys (raw keys printed to console — save them) and 5 `JobLog` records with mixed statuses.

### Run

```bash
# development
npm run start:dev

# production
npm run build
npm run start:prod
```

---

## API reference

Interactive docs available at `http://localhost:3000/api` once the server is running.

### Authentication

| Guard | Header | Value |
|---|---|---|
| ApiKeyGuard | `x-api-key` | Raw API key (prefix `bk_live_`) |
| AdminGuard | `Authorization` | `Bearer <ADMIN_SECRET>` |

---

### Webhook

#### `POST /api/webhooks/trigger`
Ingest an event from a B2B partner. Requires a valid API key.

```bash
curl -X POST http://localhost:3000/api/webhooks/trigger \
  -H "x-api-key: bk_live_<your-key>" \
  -H "Content-Type: application/json" \
  -d '{ "event": "order.shipped", "payload": { "orderId": "ord_001" } }'
```

**Response 202**
```json
{
  "jobLogId": "clx...",
  "status": "QUEUED",
  "message": "Event accepted"
}
```

---

### API key management (Admin)

#### `POST /api/api-keys`
Create a new API key. Raw key returned once — store it immediately.

```bash
curl -X POST http://localhost:3000/api/api-keys \
  -H "Authorization: Bearer <ADMIN_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Partner A" }'
```

**Response 201**
```json
{
  "id": "clx...",
  "name": "Partner A",
  "rawKey": "bk_live_...",
  "createdAt": "2025-01-01T00:00:00.000Z"
}
```

#### `GET /api/api-keys`
List all API keys (hashes redacted).

#### `DELETE /api/api-keys/:id`
Soft-delete (sets `isActive: false`).

---

### Job history (Admin)

#### `GET /api/jobs`
List job logs. Supports optional query params:

| Param | Example | Description |
|---|---|---|
| `status` | `COMPLETED` | Filter by job status |
| `limit` | `20` | Max records returned (default 20) |

```bash
curl "http://localhost:3000/api/jobs?status=FAILED&limit=10" \
  -H "Authorization: Bearer <ADMIN_SECRET>"
```

#### `GET /api/jobs/:id`
Fetch a single job log by ID.

---

### Health

#### `GET /`
```json
{ "status": "ok", "timestamp": "2025-01-01T00:00:00.000Z" }
```

---

## Testing

```bash
# run all unit tests
npm test

# with coverage report
npm run test:cov
```

Tests use Jest 30 in ESM mode. All test files mock external dependencies (Prisma, HttpService, Redis) — no real connections required.

**Test suites:** ApiKeysService · AdminGuard · ApiKeyGuard · SlackService · AppController  
**Coverage:** guards, service logic, error paths, expiry checks

---

## Project structure

```
src/
├── api-keys/          # API key CRUD + generation
├── common/
│   ├── filters/       # Global HTTP exception filter
│   ├── guards/        # AdminGuard, ApiKeyGuard
│   └── interceptors/  # Request logging
├── config/            # Env validation (ConfigModule)
├── database/          # PrismaService (pg adapter)
├── jobs/              # Job history endpoints
├── queue/             # BullMQ module + processor
├── slack/             # Slack notification service
└── webhooks/          # Webhook trigger endpoint
prisma/
├── schema.prisma      # ApiKey + JobLog models
├── seed.ts            # Demo data seed
└── migrations/        # SQL migration history
```

---

## Data model

```
ApiKey
  id          cuid (PK)
  name        string
  hashedKey   string (unique, SHA-256)
  isActive    boolean
  lastUsedAt  datetime?
  expiresAt   datetime?
  createdAt   datetime

JobLog
  id          cuid (PK)
  apiKeyId    string? (FK → ApiKey)
  event       string
  payload     JSON
  status      QUEUED | PROCESSING | COMPLETED | FAILED
  attempts    int
  error       string?
  completedAt datetime?
  createdAt   datetime
```

---

## Environment validation

The app refuses to start if any of these variables are missing:

`DATABASE_URL` · `UPSTASH_REDIS_HOST` · `UPSTASH_REDIS_PORT` · `UPSTASH_REDIS_PASSWORD` · `SLACK_BOT_TOKEN` · `SLACK_CHANNEL_ID` · `ADMIN_SECRET`

Validation runs in `AppConfigModule` via `@nestjs/config`'s `validate` option before any module initialises.
