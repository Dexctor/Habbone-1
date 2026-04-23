import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import {
  listAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  countUnreadNotifications,
} from '@/server/directus/shop';

export const dynamic = 'force-dynamic';

export const GET = withAdmin(async () => {
  const [notifications, unreadCount] = await Promise.all([
    listAdminNotifications({ limit: 30 }),
    countUnreadNotifications(),
  ]);

  return NextResponse.json({ ok: true, data: notifications, unreadCount });
}, { key: 'admin:notifs:read', limit: 120, windowMs: 60_000 });

export const POST = withAdmin(async (req) => {
  const body = await req.json().catch(() => null);
  const { action } = body || {};

  if (action === 'read') {
    const id = Number(body.id);
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    await markNotificationRead(id);
    return NextResponse.json({ ok: true });
  }

  if (action === 'read_all') {
    await markAllNotificationsRead();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}, { key: 'admin:notifs:mutate', limit: 60, windowMs: 60_000 });
