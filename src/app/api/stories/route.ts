import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { withAuth } from '@/server/api-helpers'
import { uploadStoryFile, createStoryRow, countStoriesThisMonthByAuthor } from '@/server/pocketbase/stories'
import { buildError, formatZodError } from '@/types/api'

export const dynamic = 'force-dynamic';

const ALLOWED_MIME_SET = new Set(['image/png', 'image/jpeg', 'image/gif'])
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10MB

const StoryUploadSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, 'Fichier requis')
    .refine((file) => ALLOWED_MIME_SET.has(file.type), 'Type de fichier invalide (png, jpg, gif uniquement)')
    .refine((file) => file.size <= MAX_FILE_BYTES, 'Fichier trop volumineux (max 10MB)'),
})

export const POST = withAuth(async (req, { nick }) => {
  try {
    const formData = await req.formData().catch(() => null)
    const parsed = StoryUploadSchema.safeParse({ file: formData?.get('file') })
    if (!parsed.success) {
      const fields = formatZodError(parsed.error).fieldErrors
      return NextResponse.json(buildError('Entrées invalides', { code: 'VALIDATION_ERROR', fields }), { status: 400 })
    }

    const file = parsed.data.file

    const used = await countStoriesThisMonthByAuthor(nick).catch(() => 0)
    if (used >= 10) {
      return NextResponse.json(
        { error: 'Quota mensuel atteint (10 stories / mois)', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      )
    }

    const filename = file.name?.trim() ? file.name.trim() : `story-${Date.now()}`
    const mime = file.type || 'application/octet-stream'

    const upload = await uploadStoryFile(file, filename, mime)
    const story = await createStoryRow({ author: nick, imageId: upload.id, title: filename })
    const storyId =
      story && typeof story === 'object' && story !== null ? (story as { id?: unknown }).id : null

    revalidateTag('stories')
    revalidateTag('home')
    return NextResponse.json({ ok: true, id: storyId != null ? String(storyId) : null })
  } catch (unknownError: unknown) {
    const message = unknownError instanceof Error ? unknownError.message : String(unknownError)
    const code = /UPLOAD/.test(message) ? 'UPLOAD_ERROR' : 'SERVER_ERROR'
    const status = code === 'UPLOAD_ERROR' ? 502 : 500
    const payload: { error: string; code: string; detail?: string } = { error: 'Erreur serveur', code }
    if (process.env.NODE_ENV !== 'production') payload.detail = message
    return NextResponse.json(payload, { status })
  }
}, { key: 'stories:upload', limit: 5, windowMs: 10 * 60 * 1000 })
