import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { uploadFileToDirectus } from '@/server/directus/stories';
import { directusUrl } from '@/server/directus/client';
import { validateUploadedFile } from '@/server/upload-security';

/**
 * POST /api/admin/upload
 * Accepts multipart/form-data with a single file field named "file".
 * Uploads the file to Directus assets and returns the public URL.
 * Returns { ok: true, url: "https://<directus>/assets/<id>" }
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

    const filename = file.name?.trim() || `shop-${Date.now()}.png`;
    const safeFile = new File([new Uint8Array(validation.buffer)], filename, {
      type: validation.detectedMime,
    });
    const uploaded = await uploadFileToDirectus(safeFile, filename, validation.detectedMime);
    const id = String(uploaded?.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Upload échoué — pas d\'ID retourné' }, { status: 500 });
    }

    const publicUrl = `${directusUrl}/assets/${encodeURIComponent(id)}`;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: unknown) {
    console.error('[upload] Error:', e);
    const message = e instanceof Error ? e.message : 'Erreur lors de l\'upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { key: 'admin:upload', limit: 20, windowMs: 60_000 });
