'use client';

import { type ReactNode, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  FileText,
  Info,
  LayoutGrid,
  Megaphone,
  Menu,
  Palette,
  ShoppingBag,
  Shield,
  ShoppingCart,
  TriangleAlert,
  Users,
  X,
} from 'lucide-react';
import { AdminViewProvider, useAdminView, type AdminView } from './AdminContext';
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
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-gradient-to-br from-[#2596FF] to-[#2976E8] text-[13px] font-bold text-white shadow-[0_4px_12px_-2px_rgba(37,150,255,0.5)]">
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
              className={`group relative flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-semibold transition-colors duration-200 ${
                active ? 'text-white' : 'text-[#BEBECE]/80 hover:bg-white/[0.04] hover:text-white'
              }`}
            >
              {/* animated active background (shared layout) */}
              {active && (
                <motion.span
                  layoutId="admin-nav-active"
                  className="absolute inset-0 rounded-[6px] bg-gradient-to-r from-[#2596FF] to-[#2976E8] shadow-[0_4px_14px_-4px_rgba(37,150,255,0.6)]"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <span className="relative z-10 grid place-items-center transition-transform duration-200 group-hover:scale-110">
                {item.icon}
              </span>
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Separator + back to site at bottom */}
      <div className="mt-auto">
        <div className="mb-2 h-px bg-white/5" />
        <Link
          href="/"
          className="group flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-semibold text-admin-text-tertiary transition-colors hover:bg-white/[0.04] hover:text-white"
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
    <AdminViewProvider>
      <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#141433]">
        {/* ── Top bar ── */}
        <header className="flex h-[52px] shrink-0 items-center justify-between border-b border-white/5 bg-[#1A1A3A] px-4 lg:px-6">
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

            <span className="text-[13px] text-admin-text-tertiary">
              habbone.fr / <span className="text-admin-brand-blue">admin</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative grid h-9 w-9 place-items-center rounded-[6px] text-admin-text-tertiary transition-colors hover:bg-white/5 hover:text-white"
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
                      className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#F92330] px-1 text-[10px] font-bold text-white ring-2 ring-[#1A1A3A]"
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
            <div className="flex items-center gap-2 rounded-[6px] bg-white/5 px-3 py-1.5">
              <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#2596FF] to-[#2976E8] text-[11px] font-bold uppercase text-white">
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
                  className="fixed inset-y-0 left-0 z-50 w-[260px] overflow-y-auto bg-[#141433] pt-[52px] shadow-2xl lg:hidden"
                >
                  <Sidebar onNavigate={() => setMobileOpen(false)} />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto bg-[#1A1A3A] p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminViewProvider>
  );
}
