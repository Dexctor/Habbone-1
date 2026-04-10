'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bell,
  FileText,
  LayoutGrid,
  Megaphone,
  Menu,
  MessageSquare,
  Palette,
  Shield,
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
          <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#BEBECE]/60">Panneau admin</p>
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
          className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-semibold text-[#BEBECE]/60 transition-colors hover:bg-[#25254D] hover:text-white"
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

            <span className="text-[13px] text-[#BEBECE]/60">
              habbone.com / <span className="text-[#2596FF]">admin</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification bell placeholder (visual only) */}
            <div className="relative grid h-9 w-9 place-items-center rounded-[4px] text-[#BEBECE]/50">
              <Bell className="h-[18px] w-[18px]" />
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
