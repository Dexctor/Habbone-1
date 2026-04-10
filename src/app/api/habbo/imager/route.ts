import { NextResponse } from 'next/server'
import { z } from 'zod'

import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import { buildError, searchParamsToObject, formatZodError } from '@/types/api'

const QuerySchema = z.object({
  user: z.string().trim().min(1, 'Pseudo requis').max(32, 'Pseudo trop long'),
  direction: z.string().trim().optional(),
  head_direction: z.string().trim().optional(),
  gesture: z.string().trim().optional(),
  action: z.string().trim().optional(),
  size: z.string().trim().optional(),
  headonly: z.string().trim().optional(),
  img_format: z.string().trim().optional(),
  frame_num: z.string().trim().optional(),
  effect: z.string().trim().optional(),
  dance: z.string().trim().optional(),
  gender: z.string().trim().optional(),
})

type ImagingParams = Record<string, string>

const ALLOWED_KEYS = new Set([
  'direction',
  'head_direction',
  'gesture',
  'action',
  'size',
  'headonly',
  'img_format',
  'frame_num',
  'effect',
  'dance',
  'gender',
])

function pickAllowedParams(input: Record<string, unknown>): ImagingParams {
  const out: ImagingParams = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === 'user' || !ALLOWED_KEYS.has(key)) continue
    if (typeof value !== 'string') continue
    const trimmed = value.trim()
    if (!trimmed) continue
    out[key] = trimmed
  }
  return out
}

function sanitizeFileName(value: string) {
  const cleaned = value.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
  return cleaned || 'habbo-avatar'
}

function resolveExtension(imgFormat?: string, contentType?: string | null) {
  const fmt = String(imgFormat || '').toLowerCase()
  if (fmt === 'gif') return 'gif'
  if (fmt === 'jpg' || fmt === 'jpeg') return 'jpg'
  if (fmt === 'png') return 'png'

  const ct = String(contentType || '').toLowerCase()
  if (ct.includes('gif')) return 'gif'
  if (ct.includes('jpeg') || ct.includes('jpg')) return 'jpg'
  return 'png'
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const raw = searchParamsToObject(searchParams)
  const parsed = QuerySchema.safeParse(raw)

  if (!parsed.success) {
    return NextResponse.json(
      buildError('Erreur de validation', {
        code: 'VALIDATION_ERROR',
        fields: formatZodError(parsed.error).fieldErrors,
      }),
      { status: 400 },
    )
  }

  const user = parsed.data.user
  const params = pickAllowedParams(parsed.data as Record<string, unknown>)
  const avatarUrl = buildHabboAvatarUrl(user, params)

  try {
    const upstream = await fetch(avatarUrl, {
      headers: { Accept: 'image/*' },
      cache: 'no-store',
    })

    if (!upstream.ok) {
      return NextResponse.json(
        buildError('Impossible de recuperer l avatar', { code: 'UPSTREAM_ERROR' }),
        { status: 502 },
      )
    }

    const contentType = upstream.headers.get('content-type') || 'image/png'
    const arrayBuffer = await upstream.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    const ext = resolveExtension(params.img_format, contentType)
    const filename = `${sanitizeFileName(user)}-avatar.${ext}`

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=120',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch {
    return NextResponse.json(
      buildError('Erreur Habbo imaging', { code: 'HABBO_IMAGING_ERROR' }),
      { status: 502 },
    )
  }
}
