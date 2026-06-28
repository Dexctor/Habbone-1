import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { validateUploadedFile } from '@/server/upload-security';
import { pbUploadFile } from '@/server/pocketbase/helpers';

/**
 * POST /api/admin/upload
 * Accepts multipart/form-data with a single file field named "file".
 * Validates (auth admin + MIME + size + content sniff) then stores the file in
 * the PocketBase `uploads` collection. Returns { url, id }.
 */

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = withAdmin(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    const validation = await validateUploadedFile(file, {
      allowedMimes: ALLOWED_TYPES,
      maxSize: MAX_SIZE,
      allowSvg: false,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
    }

    const { id, url } = await pbUploadFile(file, { context: 'admin' });
    return NextResponse.json({ ok: true, url, id });
  } catch (e: unknown) {
    console.error('[upload] Error:', e);
    const message = e instanceof Error ? e.message : 'Erreur lors de l\'upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { key: 'admin:upload', limit: 20, windowMs: 60_000 });
