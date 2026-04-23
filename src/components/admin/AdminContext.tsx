'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type AdminView = 'overview' | 'users' | 'content' | 'theme' | 'roles' | 'pub' | 'shop';

const ADMIN_VIEWS: readonly AdminView[] = ['overview', 'users', 'content', 'theme', 'roles', 'pub', 'shop'];

export const ADMIN_VIEW_TITLES: Record<AdminView, string> = {
  overview: 'Tableau de bord',
  users: 'Utilisateurs',
  content: 'Contenus',
  theme: 'Thème',
  roles: 'Rôles',
  pub: 'Partenaires',
  shop: 'Boutique',
};

function isAdminView(value: string | null): value is AdminView {
  return value !== null && (ADMIN_VIEWS as readonly string[]).includes(value);
}

interface AdminContextValue {
  view: AdminView;
  setView: (v: AdminView) => void;
}

const AdminCtx = createContext<AdminContextValue | null>(null);

export function AdminViewProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlView = searchParams.get('view');
  const initialView: AdminView = isAdminView(urlView) ? urlView : 'overview';
  const [view, setViewState] = useState<AdminView>(initialView);

  // Sync state ← URL (browser back/forward, external link, etc.)
  useEffect(() => {
    const current = searchParams.get('view');
    const next: AdminView = isAdminView(current) ? current : 'overview';
    setViewState((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  // Sync document.title
  useEffect(() => {
    const title = `${ADMIN_VIEW_TITLES[view]} – Administration HabbOne`;
    if (typeof document !== 'undefined' && document.title !== title) {
      document.title = title;
    }
  }, [view]);

  const setView = useCallback(
    (next: AdminView) => {
      setViewState(next);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (next === 'overview') params.delete('view');
      else params.set('view', next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(() => ({ view, setView }), [view, setView]);

  return <AdminCtx.Provider value={value}>{children}</AdminCtx.Provider>;
}

export function useAdminView() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdminView must be used inside AdminViewProvider');
  return ctx;
}
