'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Info,
  Menu,
  ShoppingCart,
  TriangleAlert,
  X,
} from 'lucide-react';
import { AdminViewProvider, useAdminView, type AdminView } from './AdminContext';
import { ADMIN_VIEW_GROUPS, ADMIN_VIEW_META, adminToneClasses } from './admin-view-meta';
import { formatRelativeFr } from '@/lib/date-utils';
import { easings, dur } from '@/lib/motion-tokens';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminNotif {
  id: string;
  type: string; // severity: 'success' | 'info' | 'warning' | 'error'
  title: string;
  message?: string;
  read: boolean;
  created?: string;
}

/* ------------------------------------------------------------------ */
/*  Sidebar navigation items                                           */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = Object.values(ADMIN_VIEW_META);

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useAdminView();

  return (
    <nav className="flex h-full flex-col p-4">
      {/* Logo / brand */}
      <div className="mb-5 flex items-center gap-3 rounded-[10px] border border-white/10 bg-white/[0.05] px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] bg-gradient-to-br from-[#42A5FF] to-[#2976E8] text-[14px] font-black text-white shadow-[0_8px_18px_-8px_rgba(66,165,255,0.9)]">
          H
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-bold uppercase tracking-[0.06em] text-white">Habbone</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-admin-text-tertiary">Panneau admin</p>
        </div>
      </div>

      {/* Nav items */}
      <div className="flex flex-1 flex-col gap-5">
        {ADMIN_VIEW_GROUPS.map((group) => (
          <div key={group} className="space-y-1.5">
            <div className="px-2 text-[10px] font-black uppercase tracking-[0.12em] text-admin-text-muted">
              {group}
            </div>
            {NAV_ITEMS.filter((item) => item.group === group).map((item) => {
              const active = view === item.id;
              const tone = adminToneClasses(item.tone);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setView(item.id);
                    onNavigate?.();
                  }}
                  className={`group relative flex min-h-[58px] w-full items-center gap-3 overflow-hidden rounded-[11px] border px-3 text-left transition-colors duration-200 ${
                    active
                      ? `${tone.soft} ${tone.glow}`
                      : 'border-transparent bg-white/[0.035] text-admin-text-tertiary hover:border-white/10 hover:bg-white/[0.075] hover:text-white'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="admin-nav-active"
                      className="absolute inset-y-2 left-1 w-1 rounded-full bg-current"
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                  <span
                    className={`relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-[8px] transition-colors duration-200 ${
                      active ? tone.icon : 'bg-white/[0.07] text-admin-text-tertiary group-hover:bg-white/10 group-hover:text-white'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="relative z-10 min-w-0">
                    <span className="block truncate text-[13px] font-black">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[10.5px] font-medium text-admin-text-tertiary">
                      {item.focus}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Separator + back to site at bottom */}
      <div className="mt-auto">
        <div className="mb-2 h-px bg-white/10" />
        <Link
          href="/"
          className="group flex min-h-[44px] items-center gap-3 rounded-[9px] border border-white/10 bg-white/[0.04] px-3 text-[13px] font-bold text-admin-text-secondary transition-colors hover:border-[#42A5FF]/40 hover:bg-[#42A5FF]/12 hover:text-white"
        >
          <ArrowLeft className="h-[18px] w-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
          Voir le site
        </Link>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/*  Notification severity → icon + colour                              */
/* ------------------------------------------------------------------ */

function notifVisual(type: string): { icon: ReactNode; color: string } {
  switch (type) {
    case 'success':
      return { icon: <ShoppingCart className="h-4 w-4" />, color: 'bg-[#0FD52F]/15 text-[#0FD52F]' };
    case 'warning':
      return { icon: <TriangleAlert className="h-4 w-4" />, color: 'bg-[#FFC800]/15 text-[#FFC800]' };
    case 'error':
      return { icon: <TriangleAlert className="h-4 w-4" />, color: 'bg-[#F92330]/15 text-[#F92330]' };
    default:
      return { icon: <Info className="h-4 w-4" />, color: 'bg-[#2596FF]/15 text-admin-brand-blue' };
  }
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
  return (
    <AdminViewProvider>
      <AdminChrome adminName={adminName}>{children}</AdminChrome>
    </AdminViewProvider>
  );
}

function AdminChrome({
  adminName,
  children,
}: {
  adminName: string;
  children: ReactNode;
}) {
  const { view } = useAdminView();
  const current = ADMIN_VIEW_META[view];
  const currentTone = adminToneClasses(current.tone);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotif[]>([]);

  // Fetch notification count on mount + every 30s
  const fetchNotifs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/notifications', { cache: 'no-store' });
      const json = await res.json();
      if (json.ok) {
        setNotifCount(json.unreadCount || 0);
        setNotifications(json.data || []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  useEffect(() => {
    document.documentElement.classList.add('admin-shell-open');
    document.body.classList.add('admin-shell-open');
    return () => {
      document.documentElement.classList.remove('admin-shell-open');
      document.body.classList.remove('admin-shell-open');
    };
  }, []);

  const handleMarkAllRead = async () => {
    setNotifCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read_all' }),
      });
    } catch {
      /* silent */
    }
  };

  const handleMarkOneRead = async (id: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === id);
      if (target && !target.read) setNotifCount((c) => Math.max(0, c - 1));
      return prev.map((n) => (n.id === id ? { ...n, read: true } : n));
    });
    try {
      await fetch('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read', id }),
      });
    } catch {
      /* silent */
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-admin-bg-900">
        {/* ── Top bar ── */}
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-white/10 bg-admin-bg-800 px-4 shadow-[0_12px_34px_-28px_rgba(0,0,0,0.9)] lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-[4px] text-[#BEBECE] transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="hidden items-center gap-3 sm:flex">
              <span className={`grid h-9 w-9 place-items-center rounded-[8px] ${currentTone.icon}`}>
                {current.icon}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-white">{current.title}</p>
                <p className="max-w-[420px] truncate text-[11px] text-admin-text-tertiary">{current.description}</p>
              </div>
            </div>
            <span className="text-[13px] text-admin-text-tertiary sm:hidden">
              habbone.fr / <span className="font-bold text-admin-brand-blue">admin</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden items-center gap-2 rounded-[7px] border border-white/10 bg-white/[0.06] px-3 py-2 text-[12px] font-bold text-admin-text-secondary transition-colors hover:border-[#42A5FF]/40 hover:bg-[#42A5FF]/14 hover:text-white sm:flex"
            >
              <ArrowLeft className="h-4 w-4" />
              Voir le site
            </Link>

            {/* Notification bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative grid h-9 w-9 place-items-center rounded-[7px] text-admin-text-tertiary transition-colors hover:bg-white/10 hover:text-white"
                aria-label={`Notifications${notifCount > 0 ? ` (${notifCount} non lues)` : ''}`}
              >
                <motion.span
                  animate={notifCount > 0 ? { rotate: [0, -12, 10, -8, 6, 0] } : { rotate: 0 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  className="grid place-items-center"
                >
                  <Bell className="h-[18px] w-[18px]" />
                </motion.span>
                <AnimatePresence>
                  {notifCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                      className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#F92330] px-1 text-[10px] font-bold text-white ring-2 ring-admin-bg-800"
                    >
                      {notifCount > 9 ? '9+' : notifCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Notification dropdown */}
              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} role="presentation" />
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.97 }}
                      transition={{ duration: dur.sm, ease: easings.emph }}
                      style={{ transformOrigin: 'top right' }}
                      className="absolute right-0 top-[44px] z-50 w-[360px] overflow-hidden rounded-[10px] border border-white/10 bg-[#1E1E3D] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)]"
                    >
                      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-white">Notifications</span>
                          {notifCount > 0 && (
                            <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#F92330] px-1.5 text-[10px] font-bold text-white">
                              {notifCount}
                            </span>
                          )}
                        </div>
                        {notifCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="flex items-center gap-1 text-[11px] font-medium text-admin-brand-blue transition-colors hover:text-white"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Tout marquer comme lu
                          </button>
                        )}
                      </div>
                      <div className="max-h-[340px] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-center">
                            <div className="mb-2 grid h-11 w-11 place-items-center rounded-full bg-white/[0.03]">
                              <Bell className="h-5 w-5 text-[#BEBECE]/30" />
                            </div>
                            <p className="text-[12px] text-admin-text-tertiary">Aucune notification</p>
                          </div>
                        ) : (
                          notifications.slice(0, 12).map((n, i) => {
                            const v = notifVisual(n.type);
                            return (
                              <motion.button
                                type="button"
                                key={n.id}
                                onClick={() => handleMarkOneRead(n.id)}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.03, duration: dur.xs, ease: easings.std }}
                                className={`flex w-full items-start gap-3 border-b border-white/[0.03] px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/[0.03] ${
                                  !n.read ? 'bg-[#2596FF]/[0.06]' : ''
                                }`}
                              >
                                <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-[7px] ${v.color}`}>
                                  {v.icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={`block text-[12px] leading-snug ${
                                      !n.read ? 'font-semibold text-white' : 'font-medium text-admin-text-secondary'
                                    }`}
                                  >
                                    {n.title}
                                  </span>
                                  {n.created && (
                                    <span className="mt-1 block text-[10.5px] text-admin-text-tertiary">
                                      {formatRelativeFr(n.created)}
                                    </span>
                                  )}
                                </span>
                                {!n.read && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2596FF] shadow-[0_0_6px_rgba(37,150,255,0.8)]" />
                                )}
                              </motion.button>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Admin badge */}
            <div className="flex items-center gap-2 rounded-[8px] border border-white/10 bg-white/[0.07] px-3 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#2596FF] to-[#2976E8] text-[11px] font-bold uppercase text-white">
                {adminName.charAt(0)}
              </div>
              <span className="hidden text-[13px] font-semibold text-white sm:inline">{adminName}</span>
            </div>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden w-[250px] shrink-0 overflow-y-auto border-r border-white/10 bg-admin-bg-800 lg:block">
            <Sidebar />
          </aside>

          {/* ── Sidebar (mobile overlay) ── */}
          <AnimatePresence>
            {mobileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: dur.xs }}
                  className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                  onClick={() => setMobileOpen(false)}
                  role="presentation"
                />
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 34 }}
                  className="fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto bg-admin-bg-800 pt-[58px] shadow-2xl lg:hidden"
                >
                  <Sidebar onNavigate={() => setMobileOpen(false)} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_left,rgba(66,165,255,0.10),transparent_34%),linear-gradient(180deg,#292957_0%,#20204A_60%,#20204A_100%)] p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
