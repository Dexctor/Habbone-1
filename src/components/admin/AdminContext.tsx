'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export type AdminView = 'overview' | 'users' | 'content' | 'theme' | 'roles' | 'pub';

interface AdminContextValue {
  view: AdminView;
  setView: (v: AdminView) => void;
}

const AdminCtx = createContext<AdminContextValue | null>(null);

export function AdminViewProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<AdminView>('overview');
  return <AdminCtx.Provider value={{ view, setView }}>{children}</AdminCtx.Provider>;
}

export function useAdminView() {
  const ctx = useContext(AdminCtx);
  if (!ctx) throw new Error('useAdminView must be used inside AdminViewProvider');
  return ctx;
}
