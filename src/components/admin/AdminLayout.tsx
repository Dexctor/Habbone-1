'use client';

import { type ReactNode, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  LayoutGrid,
  Megaphone,
  Menu,
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
  { id: 'overview', label: 'Accueil', icon: <LayoutGrid className="h-5 w-5" /> },
  { id: 'users', label: 'Membres', icon: <Users className="h-5 w-5" /> },
  { id: 'content', label: 'Contenus', icon: <FileText className="h-5 w-5" /> },
  { id: 'theme', label: 'Thème', icon: <Palette className="h-5 w-5" /> },
  { id: 'roles', label: 'Rôles', icon: <Shield className="h-5 w-5" /> },
  { id: 'pub', label: 'Publicité', icon: <Megaphone className="h-5 w-5" /> },
];

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { view, setView } = useAdminView();

  return (
    <nav className="flex h-full flex-col gap-1 p-3">
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
            className={`flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] transition-colors ${
              active
                ? 'bg-[#2596FF] text-white'
                : 'text-[#BEBECE] hover:bg-[#25254D] hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}

      {/* Separator */}
      <div className="my-3 h-px bg-white/10" />

      {/* Back to site */}
      <Link
        href="/"
        className="flex items-center gap-3 rounded-[6px] px-3 py-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-[#BEBECE] transition-colors hover:bg-[#25254D] hover:text-white"
      >
        <ArrowLeft className="h-5 w-5" />
        Retour au site
      </Link>
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
        <header className="flex h-[56px] shrink-0 items-center justify-between border-b border-white/10 bg-[#25254D] px-4 lg:px-6">
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

            <span className="text-[15px] font-bold uppercase tracking-[0.06em] text-white">
              Administration
            </span>
            <span className="hidden text-[13px] text-[#BEBECE] sm:inline">HabbOne</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] text-[#BEBECE]">{adminName}</span>
            <Link
              href="/"
              className="hidden rounded-[4px] bg-white/10 px-3 py-1.5 text-[12px] font-bold uppercase text-[#DDD] transition-colors hover:bg-white/15 sm:inline-flex"
            >
              Retour au site
            </Link>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* ── Sidebar (desktop) ── */}
          <aside className="hidden w-[220px] shrink-0 overflow-y-auto border-r border-white/10 bg-[#141433] lg:block">
            <Sidebar />
          </aside>

          {/* ── Sidebar (mobile overlay) ── */}
          {mobileOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                onClick={() => setMobileOpen(false)}
                onKeyDown={() => {}}
                role="presentation"
              />
              <aside className="fixed inset-y-0 left-0 z-50 w-[260px] overflow-y-auto bg-[#141433] pt-[56px] shadow-xl lg:hidden">
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </aside>
            </>
          )}

          {/* ── Main content ── */}
          <main className="flex-1 overflow-y-auto bg-[#1F1F3E] p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AdminViewProvider>
  );
}
