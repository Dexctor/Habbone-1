/**
 * PocketBase migration — Lot 1e: `uploads` collection (image storage).
 *
 * PocketBase attaches files to records (no central files API like Directus).
 * This collection holds uploaded images as rows with a `file` field, served
 * publicly. Used by /api/upload/image and /api/admin/upload via pbUploadFile.
 *
 * Idempotent: skipped if it already exists.
 *
 * Usage: node --env-file=.env.local --import tsx scripts/migration-pb/01e-uploads.ts
 */

import { getCollection, createCollection, f, log, PB_URL } from './_pb';

async function main(): Promise<void> {
  log(`[lot1e] target: ${PB_URL}`);
  const existing = await getCollection('uploads');
  if (existing) {
    log(`  • uploads already exists (id ${existing.id}) — skip`);
    return;
  }
  const created = await createCollection({
    name: 'uploads',
    type: 'base',
    fields: [
      {
        name: 'file',
        type: 'file',
        maxSelect: 1,
        maxSize: 5 * 1024 * 1024,
        mimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
      },
      f.text('uploaded_by'),
      f.text('context'),
    ],
    // Public read (served URLs), writes via server superuser token only.
    listRule: '',
    viewRule: '',
    createRule: null,
    updateRule: null,
    deleteRule: null,
  });
  log(`  ✓ uploads created (id ${created.id})`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[lot1e] fatal:', err instanceof Error ? err.message : err);
  process.exit(1);
});
