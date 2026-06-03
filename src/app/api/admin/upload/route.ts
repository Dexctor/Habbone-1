import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { validateUploadedFile } from '@/server/upload-security';

/**
 * POST /api/admin/upload
 * Accepts multipart/form-data with a single file field named "file".
 *
 * TODO(migration): upload PB. Cette route téléversait vers l'API Directus /files
 * (supprimée pendant la migration PocketBase). PocketBase n'expose pas la même
 * API de fichiers et la destination de stockage (collection de fichiers PB vs
 * hôte externe) n'est pas encore décidée. En attendant, on valide quand même le
 * fichier (auth + MIME + taille) puis on renvoie un 501 clair. L'upload réel
 * sera implémenté dans un lot ultérieur.
 */

export const runtime = 'nodejs';

const ALLOWED_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]);
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = withAdmin(async (req) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    const validation = await validateUploadedFile(file, {
      allowedMimes: ALLOWED_TYPES,
      maxSize: MAX_SIZE,
      allowSvg: false,
    });
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error, code: validation.code }, { status: 400 });
    }

    // TODO(migration): upload PB — implémenter le stockage du fichier validé.
    return NextResponse.json(
      { error: 'Upload non disponible (migration PocketBase en cours)' },
      { status: 501 },
    );
  } catch (e: unknown) {
    console.error('[upload] Error:', e);
    const message = e instanceof Error ? e.message : 'Erreur lors de l\'upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, { key: 'admin:upload', limit: 20, windowMs: 60_000 });
