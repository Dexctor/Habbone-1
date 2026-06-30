# PocketBase maintenance scripts

This directory is no longer a migration pipeline. It only keeps small,
idempotent maintenance scripts for the production PocketBase dataset.

Available scripts:

```bash
node --import tsx scripts/migration-pb/_scan-external-media-urls.ts
node --import tsx scripts/migration-pb/16-rehost-external-media.ts --dry-run
node --import tsx scripts/migration-pb/16-rehost-external-media.ts
```

`_pb.ts` is the shared admin auth helper used by these scripts.
