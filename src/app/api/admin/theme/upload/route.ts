import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { withAdmin } from '@/server/api-helpers';
import { themeUploadDir, writeThemeSettings } from '@/server/theme-settings-store';
import { validateUploadedFile } from '@/server/upload-security';
import { UPLOAD_POLICIES } from '@/server/upload-policies';

// TODO: store theme assets outside the ephemeral Vercel filesystem. The theme
// is currently written locally under public/uploads/theme.

const TARGETS = new Set(['logo', 'background']);

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

async function uploadToLocalPublicDir(file: File, target: string, mimeType: string, buffer: Buffer): Promise<string> {
  const ext = extensionFromMime(mimeType, file.name);
  const fileName = `${target}-${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await mkdir(themeUploadDir, { recursive: true });
  await writeFile(path.join(themeUploadDir, fileName), buffer);
  return `/uploads/theme/${fileName}`;
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
    const uploadedUrl = await uploadToLocalPublicDir(file, target, validation.detectedMime, validation.buffer);

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
