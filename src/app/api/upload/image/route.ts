import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { pbUploadFile } from '@/server/pocketbase/helpers'

/**
 * POST /api/upload/image
 * Accepts multipart/form-data with a single file field named "file".
 * Stores the image in the PocketBase `uploads` collection and returns
 * { url, id } — the served file URL and the upload record id.
 */

export const runtime = 'nodejs'

const ALLOWED_MIME_SET = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5MB

export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData().catch(() => null)
    const file = formData?.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    if (!ALLOWED_MIME_SET.has(file.type)) {
      return NextResponse.json({ error: 'Type de fichier invalide (png, jpg, gif, webp)' }, { status: 400 })
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 5MB)' }, { status: 400 })
    }

    const { id, url } = await pbUploadFile(file, { context: 'image' })
    return NextResponse.json({ ok: true, url, id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}, { key: 'upload:image', limit: 20, windowMs: 10 * 60 * 1000 })
