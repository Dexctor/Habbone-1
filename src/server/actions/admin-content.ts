'use server';

import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { assertAdmin } from '@/server/authz';
import { logAdminAction, type AdminAction } from '@/server/directus/admin-logs';
import { invalidateForum, invalidateNews, invalidateStories } from '@/server/cache-policy';
import {
  adminUpdateForumTopic,
  adminDeleteForumTopic,
  adminUpdateForumPost,
  adminDeleteForumPost,
  adminUpdateForumComment,
  adminDeleteForumComment,
} from '@/server/directus/forum';
import {
  adminUpdateNews,
  adminDeleteNews,
  adminUpdateNewsComment,
  adminDeleteNewsComment,
} from '@/server/directus/news';
import { adminUpdateStory, adminDeleteStory } from '@/server/directus/stories';

type AdminCaller = {
  id: string;
  nick: string | undefined;
};

async function requireAdmin(): Promise<AdminCaller> {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login?from=/admin');
  if (session.user.role !== 'admin') redirect('/profile');
  try {
    await assertAdmin();
  } catch {
    redirect('/profile');
  }
  return {
    id: String(session.user.id ?? ''),
    nick: session.user.nick ?? undefined,
  };
}

function audit(
  caller: AdminCaller,
  action: AdminAction,
  targetType: 'topic' | 'post' | 'article' | 'comment',
  targetId: number,
  details?: Record<string, unknown>,
) {
  return logAdminAction({
    action,
    admin_id: caller.id,
    admin_name: caller.nick,
    target_type: targetType,
    target_id: targetId,
    details,
  }).catch(() => {
    /* logging never breaks the action */
  });
}

/* ── Forum topics ───────────────────────────────────────────────────── */

export async function updateTopicAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  const patch = {
    titulo: String(formData.get('titulo') || ''),
    imagem: String(formData.get('imagem') || ''),
    conteudo: String(formData.get('conteudo') || ''),
    fixo: !!formData.get('fixo'),
    fechado: !!formData.get('fechado'),
  };
  await adminUpdateForumTopic(id, patch);
  await audit(caller, 'content.update', 'topic', id, { titulo: patch.titulo });
  invalidateForum({ topicId: id, home: true, admin: true });
}

export async function deleteTopicAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  await adminDeleteForumTopic(id);
  await audit(caller, 'content.delete', 'topic', id);
  invalidateForum({ topicId: id, home: true, admin: true });
}

/* ── Forum posts ────────────────────────────────────────────────────── */

export async function updatePostAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  const conteudo = String(formData.get('conteudo') || '');
  await adminUpdateForumPost(id, { conteudo });
  await audit(caller, 'content.update', 'post', id);
  invalidateForum({ admin: true });
}

export async function deletePostAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  await adminDeleteForumPost(id);
  await audit(caller, 'content.delete', 'post', id);
  invalidateForum({ admin: true });
}

/* ── News articles ──────────────────────────────────────────────────── */

export async function updateArticleAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  const patch = {
    titulo: String(formData.get('titulo') || ''),
    descricao: String(formData.get('descricao') || ''),
    imagem: String(formData.get('imagem') || ''),
    noticia: String(formData.get('noticia') || ''),
  };
  await adminUpdateNews(id, patch);
  await audit(caller, 'content.update', 'article', id, { titulo: patch.titulo });
  invalidateNews({ newsId: id, home: true, admin: true });
}

export async function deleteArticleAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  await adminDeleteNews(id);
  await audit(caller, 'content.delete', 'article', id);
  invalidateNews({ newsId: id, home: true, admin: true });
}

/* ── Comments ───────────────────────────────────────────────────────── */

export async function updateForumCommentAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  const comentario = String(formData.get('comentario') || '');
  await adminUpdateForumComment(id, { comentario });
  await audit(caller, 'content.update', 'comment', id, { source: 'forum' });
  invalidateForum({ admin: true });
}

export async function deleteForumCommentAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  await adminDeleteForumComment(id);
  await audit(caller, 'content.delete', 'comment', id, { source: 'forum' });
  invalidateForum({ admin: true });
}

export async function updateNewsCommentAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  const comentario = String(formData.get('comentario') || '');
  await adminUpdateNewsComment(id, { comentario });
  await audit(caller, 'content.update', 'comment', id, { source: 'news' });
  invalidateNews({ admin: true });
}

export async function deleteNewsCommentAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  await adminDeleteNewsComment(id);
  await audit(caller, 'content.delete', 'comment', id, { source: 'news' });
  invalidateNews({ admin: true });
}

/* ── Stories ────────────────────────────────────────────────────────── */

export async function updateStoryAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  const patch: Record<string, string> = {
    status: String(formData.get('status') || 'public'),
  };
  if (formData.has('titulo')) patch.titulo = String(formData.get('titulo') || '');
  if (formData.has('imagem')) patch.imagem = String(formData.get('imagem') || '');
  await adminUpdateStory(id, patch);
  await audit(caller, 'content.update', 'article', id, { kind: 'story', status: patch.status });
  invalidateStories({ home: true, admin: true });
}

export async function deleteStoryAction(formData: FormData) {
  const caller = await requireAdmin();
  const id = Number(formData.get('id') || 0);
  if (!id) return;
  await adminDeleteStory(id);
  await audit(caller, 'content.delete', 'article', id, { kind: 'story' });
  invalidateStories({ home: true, admin: true });
}
