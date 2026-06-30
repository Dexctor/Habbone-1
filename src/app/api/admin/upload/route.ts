import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { validateUploadedFile } from '@/server/upload-security';
import { UPLOAD_POLICIES } from '@/server/upload-policies';
import { pbUploadFile } from '@/server/pocketbase/helpers';

/**
 * POST /api/admin/upload
 * Accepts multipart/form-data with a single file field named "file".
 * Validates (auth admin + MIME + size + content sniff) then stores the file in
 * the PocketBase `uploads` collection. Returns { url, id }.
 */

export const runtime = 'nodejs';

function toBlobPart(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes;
}

export const POST = withAdmin(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    const validation = await validateUploadedFile(file, UPLOAD_POLICIES.adminImage);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
    }

    const safeFile = new File([toBlobPart(validation.buffer)], file.name || 'image', { type: validation.detectedMime });
    const { id, url } = await pbUploadFile(safeFile, { context: 'admin' });
    return NextResponse.json({ ok: true, url, id });
  } catch (e: unknown) {
    console.error('[upload] Error:', e);
    const message = e instanceof Error ? e.message : 'Erreur lors de l\'upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { key: 'admin:upload', limit: 20, windowMs: 60_000 });
