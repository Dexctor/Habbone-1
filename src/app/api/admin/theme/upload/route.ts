import path from 'node:path';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAdmin } from '@/server/api-helpers';
import { writeThemeSettings } from '@/server/theme-settings-store';
import { validateUploadedFile } from '@/server/upload-security';
import { UPLOAD_POLICIES } from '@/server/upload-policies';
import { pbAdmin } from '@/server/pocketbase/client';

const TARGETS = new Set(['logo', 'background']);
const POCKETBASE_THEME_UPLOAD_COLLECTION =
  (process.env.POCKETBASE_THEME_UPLOAD_COLLECTION || 'theme_uploads').trim() || 'theme_uploads';

export const runtime = 'nodejs';

function extensionFromMime(mimeType: string, fallbackName?: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  if (mimeType === 'image/svg+xml') return 'svg';
  const ext = path.extname(fallbackName || '').replace('.', '').toLowerCase();
  if (ext) return ext;
  return 'png';
}

function toBlobPart(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes;
}

async function uploadToPocketBase(file: File, target: string, mimeType: string, buffer: Buffer): Promise<string> {
  const pb = await pbAdmin();
  const ext = extensionFromMime(mimeType, file.name);
  const safeFile = new File([toBlobPart(buffer)], `theme-${target}-${Date.now()}.${ext}`, { type: mimeType });
  const form = new FormData();
  form.append('file', safeFile);
  form.append('context', `theme:${target}`);
  form.append('uploaded_by', 'admin-theme');

  const record: any = await pb.collection(POCKETBASE_THEME_UPLOAD_COLLECTION).create(form);
  const filename = Array.isArray(record.file) ? record.file[0] : record.file;
  if (!filename) throw new Error('POCKETBASE_UPLOAD_RESPONSE_INVALID');
  return pb.files.getURL(record, filename);
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
  const policy = target === 'logo' ? UPLOAD_POLICIES.themeLogo : UPLOAD_POLICIES.themeBackground;
  const validation = await validateUploadedFile(file, policy);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
  }

  try {
    const uploadedUrl = await uploadToPocketBase(file, target, validation.detectedMime, validation.buffer);

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
