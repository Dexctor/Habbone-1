import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { getDirectusAssetUrl, uploadDirectusAsset } from '@/server/directus/assets';
import { isSupabaseDataEnabled } from '@/server/supabase/config';
import { uploadSupabaseObject } from '@/server/supabase/storage';
import { fileFromValidatedUpload, validateAdminImageUpload } from '@/server/upload-policy';

/**
 * POST /api/admin/upload
 * Accepts multipart/form-data with a single file field named "file".
 * Uploads the file to Directus assets and returns the public URL.
 * Returns { ok: true, url: "https://<directus>/assets/<id>" }
 */

export const runtime = 'nodejs';

export const POST = withAdmin(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    const validation = await validateAdminImageUpload(file);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
    }

    const { filename, file: safeFile } = fileFromValidatedUpload(file, validation, `shop-${Date.now()}.png`);
    if (isSupabaseDataEnabled()) {
      const uploaded = await uploadSupabaseObject({
        file: safeFile,
        filename,
        mimeType: validation.detectedMime,
        prefix: 'admin',
      });
      return NextResponse.json({ ok: true, url: uploaded.url });
    }

    const uploaded = await uploadDirectusAsset(safeFile, filename, validation.detectedMime);
    const id = String(uploaded?.id || '').trim();

    if (!id) {
      return NextResponse.json({ error: 'Upload échoué — pas d\'ID retourné' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: getDirectusAssetUrl(id) });
  } catch (e: unknown) {
    console.error('[upload] Error:', e);
    const message = e instanceof Error ? e.message : 'Erreur lors de l\'upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { key: 'admin:upload', limit: 20, windowMs: 60_000 });
