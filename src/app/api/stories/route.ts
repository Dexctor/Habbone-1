import { NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { z } from 'zod'
import { withAuth } from '@/server/api-helpers'
import { uploadStoryFile, createStoryRow, countStoriesThisMonthByAuthor } from '@/server/pocketbase/stories'
import { buildError, formatZodError } from '@/types/api'
import { validateUploadedFile } from '@/server/upload-security'
import { formatFileSize, UPLOAD_POLICIES } from '@/server/upload-policies'

export const dynamic = 'force-dynamic';

const STORY_POLICY = UPLOAD_POLICIES.storyImage

function toBlobPart(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(buffer.byteLength)
  bytes.set(buffer)
  return bytes
}

const StoryUploadSchema = z.object({
  file: z
    .custom<File>((value) => value instanceof File, 'Fichier requis')
    .refine((file) => STORY_POLICY.allowedMimes.has(file.type), 'Type de fichier invalide (png, jpg, gif uniquement)')
    .refine((file) => file.size <= STORY_POLICY.maxSize, `Fichier trop volumineux (max ${formatFileSize(STORY_POLICY.maxSize)})`),
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
    const validation = await validateUploadedFile(file, STORY_POLICY)
    if (!validation.ok) {
      return NextResponse.json(
        buildError(validation.error, { code: validation.code }),
        { status: 400 },
      )
    }

    const used = await countStoriesThisMonthByAuthor(nick).catch(() => 0)
    if (used >= 10) {
      return NextResponse.json(
        { error: 'Quota mensuel atteint (10 stories / mois)', code: 'QUOTA_EXCEEDED' },
        { status: 429 }
      )
    }

    const filename = file.name?.trim() ? file.name.trim() : `story-${Date.now()}`
    const safeFile = new File([toBlobPart(validation.buffer)], filename, { type: validation.detectedMime })

    const upload = await uploadStoryFile(safeFile, filename, validation.detectedMime)
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
