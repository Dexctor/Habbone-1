import { NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { withAdmin } from '@/server/api-helpers';
import { readThemeSettings, writeThemeSettings } from '@/server/theme-settings-store';

const Body = z.object({
  headerLogoUrl: z.string().trim().max(512).optional(),
  headerBackgroundColor: z.string().trim().max(16).optional(),
  headerBackgroundImageUrl: z.string().trim().max(512).nullable().optional(),
  showLogo: z.boolean().optional(),
});

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withAdmin(async () => {
  try {
    const data = await readThemeSettings();
    return NextResponse.json(
      { data },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'THEME_READ_FAILED';
    return NextResponse.json(
      { error: message, code: 'THEME_READ_FAILED' },
      { status: 500 },
    );
  }
}, { key: 'admin:theme:read', limit: 60, windowMs: 60_000 });

export const POST = withAdmin(async (req) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'INVALID_BODY', code: 'INVALID_BODY' }, { status: 400 });
  }

  try {
    const data = await writeThemeSettings(parsed.data);
    revalidateTag('theme');
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'THEME_WRITE_FAILED';
    return NextResponse.json(
      { error: message, code: 'THEME_WRITE_FAILED' },
      { status: 500 },
    );
  }
}, { key: 'admin:theme:write', limit: 20, windowMs: 60_000 });
