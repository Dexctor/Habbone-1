import { NextResponse } from 'next/server';
import { assertAdmin } from '@/server/authz';
import { uploadFileToDirectus } from '@/server/directus/stories';
import { directusUrl } from '@/server/directus/client';

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
  'image/svg+xml',
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  // Auth check
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    // Validate type
    const mimeType = (file.type || '').toLowerCase();
    if (!ALLOWED_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Type non autorisé : ${file.type}. Types acceptés : PNG, JPG, GIF, WebP, SVG` },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size <= 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)` },
        { status: 400 },
      );
    }

    // Upload to Directus
    const filename = file.name?.trim() || `shop-${Date.now()}.png`;
    const uploaded = await uploadFileToDirectus(file, filename, mimeType);
    const id = String(uploaded?.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Upload échoué — pas d\'ID retourné' }, { status: 500 });
    }

    // Build public URL from Directus assets
    const publicUrl = `${directusUrl}/assets/${encodeURIComponent(id)}`;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    console.error('[upload] Error:', e);
    return NextResponse.json(
      { error: e?.message || 'Erreur lors de l\'upload' },
      { status: 500 },
    );
  }
}
