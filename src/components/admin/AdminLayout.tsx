'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  FileText,
  LayoutGrid,
  Megaphone,
  Menu,
  Palette,
  Shield,
  ShoppingBag,
  Users,
  X,
} from 'lucide-react';
import { AdminViewProvider, useAdminView, type AdminView } from './AdminContext';

/* ------------------------------------------------------------------ */
/*  Sidebar navigation items                                           */
/* ------------------------------------------------------------------ */

const NAV_ITEMS: { id: AdminView; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Tableau de bord', icon: <LayoutGrid className="h-[18px] w-[18px]" /> },
  { id: 'content', label: 'Actualités', icon: <FileText className="h-[18px] w-[18px]" /> },
  { id: 'users', label: 'Utilisateurs', icon: <Users className="h-[18px] w-[18px]" /> },
  { id: 'shop', label: 'Boutique', icon: <ShoppingBag className="h-[18px] w-[18px]" /> },
  { id: 'pub', label: 'Partenaires', icon: <Megaphone className="h-[18px] w-[18px]" /> },
  { id: 'theme', label: 'Thème', icon: <Palette className="h-[18px] w-[18px]" /> },
  { id: 'roles', label: 'Rôles', icon: <Shield className="h-[18px] w-[18px]" /> },
];

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useAdminView();

  return (
    <nav className="flex h-full flex-col p-3">
      {/* Logo / brand */}
      <div className="mb-6 flex items-center gap-2.5 px-3 py-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-[#2596FF] text-[13px] font-bold text-white">
          H
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-white">Habbone</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-admin-text-tertiary">Panneau admin</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setView(item.id);
                onNavigate?.();
              }}
              className={`flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                active
                  ? 'bg-[#2596FF] text-white'
                  : 'text-[#BEBECE]/80 hover:bg-[#25254D] hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Separator + back to site at bottom */}
      <div className="mt-auto">
        <div className="mb-2 h-px bg-white/5" />
        <Link
          href="/"
          className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-semibold text-admin-text-tertiary transition-colors hover:bg-[#25254D] hover:text-white"
        >
          <ArrowLeft className="h-[18px] w-[18px]" />
          Voir le site
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Layout (exported)                                             */
/* ------------------------------------------------------------------ */

export default function AdminLayout({
  adminName,
  children,
}: {
  adminName: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<{ id: number; title: string; message?: string; read: boolean; date_created?: string }[]>([]);

  // Fetch notification count on mount + every 30s
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setNotifCount(json.unreadCount || 0);
        setNotifications(json.data || []);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' }),
      });
      setNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch { /* silent */ }
  };

  return (
    <AdminViewProvider>
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#141433]">
        {/* ── Top bar ── */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/5 bg-[#1A1A3A] px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-[4px] text-[#BEBECE] hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <span className="text-[13px] text-admin-text-tertiary">
              habbone.com / <span className="text-admin-brand-blue">admin</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative grid h-9 w-9 place-items-center rounded-[4px] text-admin-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
                aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} non lues)` : ''}`}
              >
                <Bell className="h-[18px] w-[18px]" />
                {notifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#F92330] px-1 text-[10px] font-bold text-white">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {/* Notification dropdown */}
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} role="presentation" />
                  <div className="absolute right-0 top-[42px] z-50 w-[340px] rounded-[8px] border border-white/10 bg-[#1E1E3D] shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                      <span className="text-[13px] font-bold text-white">Notifications</span>
                      {notifCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkAllRead}
                          className="text-[11px] text-admin-brand-blue hover:underline"
                        >
                          Tout marquer comme lu
                        </button>
                      )}
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="py-6 text-center text-[12px] text-admin-text-tertiary">
                          Aucune notification
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div
                            key={n.id}
                            className={`border-b border-white/[0.03] px-4 py-3 ${!n.read ? 'bg-[#2596FF]/5' : ''}`}
                          >
                            <p className={`text-[12px] font-medium ${!n.read ? 'text-white' : 'text-admin-text-tertiary'}`}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="mt-0.5 text-[11px] text-admin-text-tertiary">{n.message}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Admin badge */}
            <div className="flex items-center gap-2 rounded-[6px] bg-white/5 px-3 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-[#2596FF] text-[11px] font-bold uppercase text-white">
                {adminName.charAt(0)}
              </div>
              <span className="hidden text-[13px] font-semibold text-white sm:inline">{adminName}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden w-[230px] shrink-0 overflow-y-auto border-r border-white/5 bg-[#141433] lg:block">
            <Sidebar />
          </aside>

          {/* ── Sidebar (mobile overlay) ── */}
          {mobileOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setMobileOpen(false)}
                onKeyDown={() => {}}
                role="presentation"
              />
              <aside className="fixed inset-y-0 left-0 z-50 w-[260px] overflow-y-auto bg-[#141433] pt-[52px] shadow-xl lg:hidden">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </aside>
            </>
          )}

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto bg-[#1A1A3A] p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminViewProvider>
  );
}
