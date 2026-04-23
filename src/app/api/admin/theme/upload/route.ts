import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAdmin } from '@/server/api-helpers';
import { directusUrl } from '@/server/directus/client';
import { uploadFileToDirectus } from '@/server/directus/stories';
import { isThemeStoredInDirectus, themeUploadDir, writeThemeSettings } from '@/server/theme-settings-store';
import { validateUploadedFile } from '@/server/upload-security';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
]);
const TARGETS = new Set(['logo', 'background']);

export const runtime = 'nodejs';

function extensionFromFile(file: File): string {
  const mimeType = (file.type || '').toLowerCase();
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/svg+xml') return 'svg';
  const ext = path.extname(file.name || '').replace('.', '').toLowerCase();
  if (ext) return ext;
  return 'png';
}

async function uploadToLocalPublicDir(file: File, target: string, buffer: Buffer): Promise<string> {
  const ext = extensionFromFile(file);
  const fileName = `${target}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await mkdir(themeUploadDir, { recursive: true });
  await writeFile(path.join(themeUploadDir, fileName), buffer);
  return `/uploads/theme/${fileName}`;
}

async function uploadToDirectusAssets(file: File, buffer: Buffer, detectedMime: string): Promise<string> {
  const fallbackExt = extensionFromFile(file);
  const sourceName = (file.name || '').trim();
  const filename = sourceName || `theme-${Date.now()}.${fallbackExt}`;
  const safeFile = new File([new Uint8Array(buffer)], filename, { type: detectedMime });
  const uploaded = await uploadFileToDirectus(safeFile, filename, detectedMime);
  const id = String(uploaded?.id || '').trim();
  if (!id) throw new Error('DIRECTUS_UPLOAD_NO_ID');
  return `${directusUrl}/assets/${encodeURIComponent(id)}`;
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
  const validation = await validateUploadedFile(file, {
    allowedMimes: ALLOWED_MIME_TYPES,
    maxSize: MAX_FILE_SIZE,
    allowSvg: true,
  });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
  }

  try {
    const uploadedUrl = isThemeStoredInDirectus()
      ? await uploadToDirectusAssets(file, validation.buffer, validation.detectedMime)
      : await uploadToLocalPublicDir(file, target, validation.buffer);

    const settings = await writeThemeSettings(
      target === 'logo'
        ? { headerLogoUrl: uploadedUrl }
        : { headerBackgroundImageUrl: uploadedUrl },
    );

    revalidateTag('theme');
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
