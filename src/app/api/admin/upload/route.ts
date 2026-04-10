import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { assertAdmin } from '@/server/authz';

/**
 * POST /api/admin/upload
 * Accepts a multipart/form-data with a single file field named "file".
 * Saves to public/uploads/shop/<timestamp>-<sanitized-filename>
 * Returns { ok: true, url: "/uploads/shop/..." }
 */

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: Request) {
  // Auth check
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Aucun fichier envoyé' }, { status: 400 });
    }

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Type non autorisé : ${file.type}. Types acceptés : PNG, JPG, GIF, WebP, SVG` },
        { status: 400 },
      );
    }

    // Validate size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `Fichier trop volumineux (max ${MAX_SIZE / 1024 / 1024} Mo)` },
        { status: 400 },
      );
    }

    // Sanitize filename: remove special chars, keep extension
    const ext = path.extname(file.name).toLowerCase() || '.png';
    const baseName = file.name
      .replace(/\.[^/.]+$/, '') // remove extension
      .replace(/[^a-zA-Z0-9_-]/g, '_') // sanitize
      .substring(0, 60); // limit length
    const timestamp = Date.now();
    const finalName = `${timestamp}-${baseName}${ext}`;

    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'shop');
    await mkdir(uploadDir, { recursive: true });

    // Write file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, finalName);
    await writeFile(filePath, buffer);

    // Return public URL
    const publicUrl = `/uploads/shop/${finalName}`;

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e: any) {
    console.error('[upload] Error:', e);
    return NextResponse.json({ error: 'Erreur lors de l\'upload' }, { status: 500 });
  }
}
