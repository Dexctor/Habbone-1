import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import {
  isThemeStoredInPocketBase,
  isThemeStoredInSupabase,
  themeUploadDir,
  writeThemeSettings,
} from '@/server/theme-settings-store';
import { pocketBaseFileUrl, pocketBaseRequest } from '@/server/pocketbase';
import { uploadSupabaseObject } from '@/server/supabase/storage';
import { extensionForMime, fileFromValidatedUpload, validateThemeImageUpload } from '@/server/upload-policy';
import { invalidateTheme } from '@/server/cache-policy';

const TARGETS = new Set(['logo', 'background']);
const POCKETBASE_THEME_UPLOAD_COLLECTION =
  (process.env.POCKETBASE_THEME_UPLOAD_COLLECTION || 'theme_uploads').trim() || 'theme_uploads';

export const runtime = 'nodejs';

type PocketBaseUploadRecord = {
  id: string;
  collectionId?: string;
  collectionName?: string;
  file?: string;
};

async function uploadToLocalPublicDir(target: string, buffer: Buffer, detectedMime: string): Promise<string> {
  const ext = extensionForMime(detectedMime);
  const fileName = `${target}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await mkdir(themeUploadDir, { recursive: true });
  await writeFile(path.join(themeUploadDir, fileName), buffer);
  return `/uploads/theme/${fileName}`;
}

async function uploadToSupabaseStorage(file: File, buffer: Buffer, detectedMime: string, target: string): Promise<string> {
  const fallbackExt = extensionForMime(detectedMime);
  const { filename, file: safeFile } = fileFromValidatedUpload(
    file,
    { ok: true, detectedMime, buffer },
    `theme-${target}-${Date.now()}.${fallbackExt}`,
  );
  const uploaded = await uploadSupabaseObject({
    file: safeFile,
    filename,
    mimeType: detectedMime,
    prefix: 'theme',
  });
  return uploaded.url;
}

async function uploadToPocketBase(file: File, buffer: Buffer, detectedMime: string, target: string): Promise<string> {
  const fallbackExt = extensionForMime(detectedMime);
  const { filename, file: safeFile } = fileFromValidatedUpload(
    file,
    { ok: true, detectedMime, buffer },
    `theme-${target}-${Date.now()}.${fallbackExt}`,
  );
  const formData = new FormData();
  formData.set('file', safeFile, filename);
  formData.set('context', `theme:${target}`);
  formData.set('uploaded_by', 'admin-theme');

  const record = await pocketBaseRequest<PocketBaseUploadRecord>(
    `/api/collections/${encodeURIComponent(POCKETBASE_THEME_UPLOAD_COLLECTION)}/records`,
    {
      method: 'POST',
      body: formData,
    },
  );
  if (!record.id || !record.file) throw new Error('POCKETBASE_UPLOAD_RESPONSE_INVALID');

  return pocketBaseFileUrl(
    record.collectionId || record.collectionName || POCKETBASE_THEME_UPLOAD_COLLECTION,
    record.id,
    record.file,
  );
}

export const POST = withAdmin(async (req) => {
  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'INVALID_FORM_DATA', code: 'INVALID_FORM_DATA' }, { status: 400 });
  }

  const target = String(formData.get('target') || '').toLowerCase();
  const file = formData.get('file');
  if (!TARGETS.has(target)) {
    return NextResponse.json({ error: 'INVALID_TARGET', code: 'INVALID_TARGET' }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'FILE_REQUIRED', code: 'FILE_REQUIRED' }, { status: 400 });
  }
  const validation = await validateThemeImageUpload(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
  }

  try {
    const uploadedUrl = isThemeStoredInPocketBase()
      ? await uploadToPocketBase(file, validation.buffer, validation.detectedMime, target)
      : isThemeStoredInSupabase()
        ? await uploadToSupabaseStorage(file, validation.buffer, validation.detectedMime, target)
        : await uploadToLocalPublicDir(target, validation.buffer, validation.detectedMime);

    const settings = await writeThemeSettings(
      target === 'logo'
        ? { headerLogoUrl: uploadedUrl }
        : { headerBackgroundImageUrl: uploadedUrl },
    );

    invalidateTheme();
    return NextResponse.json({
      data: {
        url: uploadedUrl,
        settings,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'THEME_UPLOAD_FAILED';
    return NextResponse.json(
      { error: message, code: 'THEME_UPLOAD_FAILED' },
      { status: 500 },
    );
  }
}, { key: 'admin:theme:upload', limit: 10, windowMs: 60_000 });
