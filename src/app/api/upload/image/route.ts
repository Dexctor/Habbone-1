import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'
import { getDirectusAssetUrl, uploadDirectusAsset } from '@/server/directus/assets'
import { fileFromValidatedUpload, validatePublicImageUpload } from '@/server/upload-policy'

export const POST = withAuth(async (req) => {
  try {
    const formData = await req.formData().catch(() => null)
    const file = formData?.get('file')
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier requis' }, { status: 400 })
    }

    const validation = await validatePublicImageUpload(file)
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 })
    }

    const { filename, file: safeFile } = fileFromValidatedUpload(file, validation, `image-${Date.now()}`)
    const uploaded = await uploadDirectusAsset(safeFile, filename, validation.detectedMime)
    const id = String(uploaded?.id || '').trim()
    if (!id) {
      return NextResponse.json({ error: 'Upload échoué (pas d\'ID)' }, { status: 502 })
    }

    const imageUrl = getDirectusAssetUrl(id)
    return NextResponse.json({ ok: true, url: imageUrl, id: String(id) })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}, { key: 'upload:image', limit: 20, windowMs: 10 * 60 * 1000 })
