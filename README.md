# Mini CRM

Unified inbox CRM built with Next.js + Prisma (SQLite).

It combines multiple channels into one workspace:
- Telegram
- WhatsApp
- Email (forwarding/webhook ingestion)

## What this project does

- Multi-workspace CRM with auth and role-based access
- Unified Inbox with conversations and message timeline
- Integration model: `Provider → Integration → Conversation → Message`
- CRM linking from conversation:
  - Link/unlink contact
  - Link/unlink lead
  - Create contact from conversation
  - Create lead from conversation
- Conversation workflow:
  - Mark read/unread
  - Resolve/reopen
  - Assign/unassign owner
- Integration event logs for debugging incoming events

## Tech stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Prisma 7 + SQLite (`better-sqlite3`)
- Tailwind CSS 4
- JWT auth (`jwt-simple`)

## Project structure

The codebase now follows a domain-oriented structure in `lib`:

- `lib/server/*`
  - Server-only modules: DB client, auth/session, encryption, provider clients.
- `lib/features/*`
  - Feature logic shared across API/routes (for example inbox normalization, custom field services).
- `lib/client/*`
  - Browser-only helpers (toasts, confirm dialog events, etc.).

Legacy flat files in `lib/*.ts` are kept as compatibility re-exports. New code should import from the domain folders above.

### API route conventions

For new API handlers, prefer the shared server helpers:

- `lib/server/auth/require-user.ts`
  - `requireApiUser(req)` for workspace-authenticated handlers.
- `lib/server/http/responses.ts`
  - `withApiHandler(...)` for centralized exception handling.
  - `badRequest/unauthorized/notFound` typed errors.

This keeps route files focused on business logic and avoids repeated `401/400/404` boilerplate.

## Quick start

1) Install dependencies:

```bash
npm install
```

2) Create environment file (`.env`) with at least:

```bash
DATABASE_URL="file:./dev.db"
JWT_SECRET="change-this-secret"
CREDENTIALS_SECRET="change-this-too"
PUBLIC_BASE_URL="https://your-public-url" # optional for local dev, recommended for webhooks
```

3) Sync database schema:

```bash
npx prisma db push
npx prisma generate
```

4) Start dev server:

```bash
npm run dev
```

5) Open app:

- http://localhost:3000
- Register first user/workspace at `/register`

## NPM scripts

```bash
npm run dev    # Next dev server
npm run build  # Production build + type check
npm run start  # Run built app
npm run lint   # ESLint
```

## Core features

### 1) Integrations

Settings → Integrations supports:
- Telegram connect/reconnect/disconnect
- WhatsApp connect/reconnect/disconnect
- Email connect/reconnect/disconnect

Credentials are stored encrypted (`credentialsEnc`), and UI shows only masked values.

### 2) Inbound ingestion

- Telegram webhook: `POST /api/webhooks/telegram/:integrationId`
- WhatsApp webhook: `POST /api/webhooks/whatsapp/:integrationId`
- Email ingestion webhook: `POST /api/webhooks/email/:integrationId`

Every inbound event is logged into `IntegrationEventLog` with statuses:
- `received`
- `processed`
- `ignored`
- `failed`

### 3) Inbox and conversations

Inbox supports:
- Filters: status, provider, assignee, linked/unlinked
- Search by name/username/phone/email/subject/preview
- Conversation details panel with CRM actions
- Chat-like timeline (inbound/outbound visual difference)
- Reply composer (currently outbound send enabled for Telegram)

### 4) CRM actions from conversation

API routes:
- `POST /api/conversations/:id/create-contact`
- `POST /api/conversations/:id/create-lead`
- `POST /api/conversations/:id/link-contact`
- `POST /api/conversations/:id/link-lead`
- `POST /api/conversations/:id/unlink-contact`
- `POST /api/conversations/:id/unlink-lead`
- `PATCH /api/conversations/:id` (read/resolved/assigned)

## Email webhook payload (MVP)

`POST /api/webhooks/email/:integrationId`

Expected JSON body:

```json
{
  "messageId": "unique-message-id",
  "threadId": "thread-id",
  "from": { "name": "Alice", "email": "alice@example.com" },
  "subject": "Hello",
  "text": "Plain text body",
  "html": "<p>HTML body</p>",
  "sentAt": "2026-03-14T10:00:00Z"
}
```

Notes:
- `threadId` is used as conversation grouping key (`externalChatId`)
- Deduping uses `externalMessageId` when provided

## WhatsApp webhook verification

`GET /api/webhooks/whatsapp/:integrationId`

Supports Meta webhook verification via:
- `hub.mode`
- `hub.verify_token`
- `hub.challenge`

`POST /api/webhooks/whatsapp/:integrationId` handles inbound messages and supports optional signature verification when app secret is set.

## Security and tenancy

- Workspace isolation is enforced in API queries
- Sensitive credentials are encrypted at rest
- JWT session cookie for auth
- Integrations can be disconnected without deleting history

## Database models (high level)

- `Workspace`
- `User`
- `Contact`
- `Lead`
- `Integration`
- `Conversation`
- `Message`
- `IntegrationEventLog`
- `CustomFieldDefinition` / `CustomFieldValue`

## Current limitations (MVP)

- Outbound replies are implemented for Telegram only
- Email is inbound-focused (forwarding/webhook strategy)
- WhatsApp/Email advanced outbound tooling and analytics are intentionally out of scope

## Build status

Latest local check:

```bash
npm run build
```
