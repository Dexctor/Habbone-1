import { NextResponse } from 'next/server';
import { listForumTopicsByAuthorService } from '@/server/directus/forum';
import { buildError } from '@/types/api';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const author = url.searchParams.get('author')?.trim();
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : 30;

  if (!author) {
    return NextResponse.json(buildError('Auteur requis', { code: 'AUTHOR_REQUIRED' }), { status: 400 });
  }

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 30;

  try {
    const data = await listForumTopicsByAuthorService(author, safeLimit);
    return NextResponse.json({ data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(buildError(message || 'Erreur serveur', { code: 'SERVER_ERROR' }), { status: 500 });
  }
}
