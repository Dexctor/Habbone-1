import { NextResponse } from 'next/server'
import { withAuth } from '@/server/api-helpers'

/**
 * POST /api/upload/image
 * Accepts multipart/form-data with a single file field named "file".
 *
 * TODO(migration): upload PB. Cette route téléversait vers l'API Directus /files
 * (supprimée pendant la migration PocketBase). PocketBase n'expose pas la même
 * API de fichiers et la destination de stockage n'est pas encore décidée. On
 * valide quand même le fichier (auth + MIME + taille) puis on renvoie un 501
 * clair. L'upload réel sera implémenté dans un lot ultérieur.
 */

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

    // TODO(migration): upload PB — implémenter le stockage du fichier validé.
    return NextResponse.json(
      { error: 'Upload non disponible (migration PocketBase en cours)' },
      { status: 501 },
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: 'Erreur serveur', ...(process.env.NODE_ENV !== 'production' ? { detail: message } : {}) },
      { status: 500 }
    )
  }
}, { key: 'upload:image', limit: 20, windowMs: 10 * 60 * 1000 })
