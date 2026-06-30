import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { pbUploadFile } from '@/server/pocketbase/helpers'
import { validateUploadedFile } from '@/server/upload-security'
import { UPLOAD_POLICIES } from '@/server/upload-policies'

/**
 * POST /api/upload/image
 * Accepts multipart/form-data with a single file field named "file".
 * Stores the image in the PocketBase `uploads` collection and returns
 * { url, id } — the served file URL and the upload record id.
 */

export const runtime = 'nodejs'

function toBlobPart(buffer: Buffer): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(buffer.byteLength)
  bytes.set(buffer)
  return bytes
}

export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData().catch(() => null)
    const file = formData?.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    const validation = await validateUploadedFile(file, UPLOAD_POLICIES.contentImage)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })
    }

    const safeFile = new File([toBlobPart(validation.buffer)], file.name || 'image', { type: validation.detectedMime })
    const { id, url } = await pbUploadFile(safeFile, { context: 'image' })
    return NextResponse.json({ ok: true, url, id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}, { key: 'upload:image', limit: 20, windowMs: 10 * 60 * 1000 })
