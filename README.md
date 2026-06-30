# Habbone

Production Next.js application for habbone.fr.

## Stack

- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS v4
- NextAuth credentials sessions
- PocketBase for application data and uploads
- Upstash Redis for cache
- Vercel for the web app

## Required Environment

```env
POCKETBASE_URL=https://pb.habbone.fr
POCKETBASE_ADMIN_EMAIL=...
POCKETBASE_ADMIN_PASSWORD=...
REDIS_URL=rediss://default:...@...upstash.io:6379
NEXTAUTH_URL=https://habbone.fr
NEXTAUTH_SECRET=...
HABBO_API_BASE=https://www.habbo.fr
```

`REDIS_URL` is optional for local development; the app falls back to direct fetches when it is missing.

## Commands

```bash
npm run dev
npm run typecheck
npm run build
npm run test
```

## Operations

PocketBase service and backup units are versioned in `ops/pocketbase`.

Useful audits:

```bash
node --import tsx scripts/migration-pb/_scan-external-media-urls.ts
node --import tsx scripts/migration-pb/16-rehost-external-media.ts --dry-run
```
