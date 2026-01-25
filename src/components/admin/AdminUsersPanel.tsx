"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Ban, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Role = {
  id: string;
  name: string;
  admin_access?: boolean;
  app_access?: boolean;
};

type User = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string | null;
  role?: { id: string; name?: string } | string | null;
  _source?: "legacy" | "directus";
  _roleName?: string | null;
  _flags?: { isFounder?: boolean; isAdmin?: boolean } | null;
};

type SourceOption = "auto" | "legacy" | "directus";

type AdminStatusPayload = {
  rolesVirtual: boolean;
  usersFallback: boolean;
  usersSource: "legacy" | "directus" | "unknown";
};

const limit = 10;

export default function AdminUsersPanel({
  onStatusChange,
}: {
  onStatusChange?: (status: AdminStatusPayload) => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesVirtual, setRolesVirtual] = useState(false);
  const [usersSource, setUsersSource] = useState<AdminStatusPayload["usersSource"]>("unknown");
  const [usersFallback, setUsersFallback] = useState(false);
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [source, setSource] = useState<SourceOption>("auto");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/admin/roles/list", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        setRoles(Array.isArray(json?.data) ? json.data : []);
        setRolesVirtual(Boolean(json?.meta?.virtual));
      })
      .catch(() => {
        setRoles([]);
        setRolesVirtual(false);
      });
  }, []);

  const roleOptions = useMemo(() => roles.map((r) => ({ value: r.id, label: r.name })), [roles]);

  useEffect(() => {
    onStatusChange?.({ rolesVirtual, usersFallback, usersSource });
  }, [rolesVirtual, usersFallback, usersSource, onStatusChange]);

  const getUsers = async ({ page: targetPage = page, source: targetSource = source, query = q, role = roleId, stat = status } = {}) => {
    setLoading(true);
    try {
      const qs = targetSource === "auto" ? "" : `?source=${targetSource}`;
      const res = await fetch(`/api/admin/users/search${qs}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ q: query || undefined, roleId: role || undefined, status: stat || undefined, page: targetPage, limit }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "FETCH_FAILED");
      const rows: User[] = Array.isArray(json?.data) ? json.data : [];
      const metaSource = json?.meta?.source;
      const resolvedSource = metaSource === "legacy" || metaSource === "directus" ? metaSource : "unknown";
      setUsersSource(resolvedSource);
      setUsersFallback(Boolean(json?.meta?.fallback));
      const decorated = rows
        .map((u) => {
          const roleObj = (typeof u.role === "object" && u.role) ? (u.role as any) : null;
          const rawName = (u as any)._roleName || roleObj?.name || "";
          const norm = String(rawName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
          const isFounder = norm.includes('fondateur') || norm.includes('founder');
          const isAdmin = isFounder || norm.includes('admin') || (roleObj?.admin_access === true);
          return { ...u, _roleName: rawName || null, _flags: { isFounder, isAdmin } } as User;
        })
        .sort((a: User, b: User) => {
          const wa = (a._flags?.isFounder ? 0 : a._flags?.isAdmin ? 1 : 2);
          const wb = (b._flags?.isFounder ? 0 : b._flags?.isAdmin ? 1 : 2);
          return wa - wb;
        });
      setItems(decorated);
      setTotal(Number(json?.total || rows.length || 0));
      setPage(targetPage);
      const next: Record<string, string> = {};
      for (const u of rows) {
        const r = typeof u.role === "object" ? (u.role as any)?.id : (u.role as any);
        if (r) next[u.id] = String(r);
      }
      setSelectedRoles(next);
    } catch (e) {
      toast.error("Impossible de charger les utilisateurs");
      setItems([]);
      setTotal(0);
      setUsersSource("unknown");
      setUsersFallback(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getUsers({ page: 1, source }).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const onSaveRole = async (userId: string, nextRoleId: string | undefined) => {
    if (!nextRoleId) return;
    setSavingId(userId);
    try {
      const res = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId, roleId: nextRoleId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Echec de la mise a jour du role");
        return;
      }
      toast.success("Role mis a jour");
      await getUsers();
    } catch {
      toast.error("Impossible de mettre a jour le role");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleBan = async (user: User, ban: boolean) => {
    if (!confirm(ban ? `Bannir ${user.email || "cet utilisateur"} ?` : `Reactivier ${user.email || "cet utilisateur"} ?`)) return;
    setBanLoadingId(user.id);
    try {
      const res = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: user.id, ban }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Impossible de mettre a jour le statut");
        return;
      }
      toast.success(ban ? "Utilisateur banni" : "Utilisateur reactive");
      await getUsers();
    } catch {
      toast.error("Impossible de mettre a jour le statut");
    } finally {
      setBanLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Supprimer definitivement ${user.email || "cet utilisateur"} ?`)) return;
    setDeleteLoadingId(user.id);
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json?.error || "Suppression impossible");
        return;
      }
      toast.success("Utilisateur supprime");
      await getUsers();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSearch = () => getUsers({ page: 1 }).catch(() => undefined);
  const handleReset = () => {
    setQ("");
    setRoleId(undefined);
    setStatus(undefined);
    setPage(1);
    getUsers({ page: 1, query: "", role: undefined, stat: undefined }).catch(() => undefined);
  };

  const pageCount = Math.max(1, Math.ceil(total / limit));

  const formatFullName = (u: User) => [u.first_name, u.last_name].filter(Boolean).join(" ") || "-";

  return (
    <div className="space-y-5">
      {/* Filters */}
      <section className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/35 p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex-1 space-y-1">
            <Label htmlFor="admin-users-search" className="text-xs text-[color:var(--foreground)]/70">Recherche</Label>
            <Input
              id="admin-users-search"
              placeholder="Rechercher par email ou nom"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
              className="h-10 rounded-md border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/40 focus-visible:border-[color:var(--bg-300)] focus-visible:ring-[color:var(--bg-300)]"
            />
          </div>
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 md:w-auto">
            <div className="space-y-1">
              <Label htmlFor="admin-users-source" className="text-xs text-[color:var(--foreground)]/70">Source</Label>
              <Select value={source} onValueChange={(v) => setSource(v as SourceOption)}>
                <SelectTrigger id="admin-users-source" className="h-10 border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/40">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
              <SelectContent className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/95 text-[color:var(--foreground)]">
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                  <SelectItem value="directus">Directus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-users-status" className="text-xs text-[color:var(--foreground)]/70">Statut</Label>
              <Select value={status ?? "__ALL__"} onValueChange={(v) => setStatus(v === "__ALL__" ? undefined : v)}>
                <SelectTrigger id="admin-users-status" className="h-10 border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/40">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/95 text-[color:var(--foreground)]">
                  <SelectItem value="__ALL__">Tous</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-users-role" className="text-xs text-[color:var(--foreground)]/70">Role</Label>
              <Select value={roleId ?? "__ALL__"} onValueChange={(v) => setRoleId(v === "__ALL__" ? undefined : v)}>
                <SelectTrigger id="admin-users-role" className="h-10 border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/40">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/95 text-[color:var(--foreground)]">
                  <SelectItem value="__ALL__">Tous</SelectItem>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={handleSearch} disabled={loading} className="h-9 px-3">
            {loading ? "Recherche..." : "Appliquer"}
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={loading} className="h-9 px-3">
            Reinitialiser
          </Button>
          <span className="ml-auto text-xs text-[color:var(--foreground)]/70">{loading ? "Chargement..." : `${total} resultat${total>1?'s':''}`}</span>
        </div>
      </section>

      {/* Users table */}
      <section className="rounded-lg border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-900)]/35 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--bg-800)]/60 text-[color:var(--foreground)]/80">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Utilisateur</th>
                <th className="px-4 py-2.5 text-left font-medium">Email</th>
                <th className="px-4 py-2.5 text-left font-medium">Role</th>
                <th className="px-4 py-2.5 text-left font-medium">Statut</th>
                <th className="px-4 py-2.5 text-left font-medium">Source</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => {
                const currentRoleId = typeof u.role === 'object' ? (u.role as any)?.id : (u.role as any);
                const selected = selectedRoles[u.id] ?? currentRoleId ?? '';
                const isSaving = savingId === u.id;
                const isBanBusy = banLoadingId === u.id;
                const isDeleteBusy = deleteLoadingId === u.id;
                const isSuspended = String(u.status || '').toLowerCase() === 'suspended';
                const sourceLabel = u._source ? u._source : '-';
                const displayRole = (u._roleName && u._roleName.trim()) || (typeof u.role === 'object' ? ((u.role as any)?.name || '') : '') || '';
                const isFounder = !!u._flags?.isFounder;
                const isAdmin = !!u._flags?.isAdmin && !isFounder;
                return (
                  <tr key={u.id} className="border-t border-[color:var(--bg-700)]/50">
                    <td className="px-4 py-2.5 text-[color:var(--foreground)]">
                      <div className="flex flex-col">
                        <span>{formatFullName(u)}</span>
                        <div className="mt-1 flex items-center gap-2 text-xs text-[color:var(--foreground)]/70">
                          {isFounder ? (
                            <Badge variant="outline" className="border-[#f7c600]/60 text-[#f7c600]">Fondateur</Badge>
                          ) : isAdmin ? (
                            <Badge variant="outline">Admin</Badge>
                          ) : null}
                          {displayRole ? <span className="opacity-80">{displayRole}</span> : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-[color:var(--foreground)]/80">{u.email || '-'}</td>
                    <td className="px-4 py-2.5">
                      <Select
                        value={String(selected || '')}
                        onValueChange={async (v) => { setSelectedRoles((m) => ({ ...m, [u.id]: v })); await onSaveRole(u.id, v); }}
                        disabled={isSaving || rolesVirtual}
                      >
                        <SelectTrigger className="h-9 min-w-40 border border-[color:var(--bg-600)]/60 bg-[color:var(--bg-900)]/40">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                        <SelectContent className="border border-[color:var(--bg-700)]/60 bg-[color:var(--bg-800)]/95 text-[color:var(--foreground)]">
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2.5"><Badge variant={isSuspended ? 'secondary' : 'default'}>{isSuspended ? 'Suspendu' : 'Actif'}</Badge></td>
                    <td className="px-4 py-2.5 text-[color:var(--foreground)]/70 capitalize">{sourceLabel}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          variant={isSuspended ? 'secondary' : 'outline'}
                          onClick={() => handleToggleBan(u, !isSuspended)}
                          disabled={isBanBusy}
                          className="h-9 px-3 inline-flex items-center gap-2"
                          aria-label={isSuspended ? 'Réactiver utilisateur' : 'Bannir utilisateur'}
                        >
                          <Ban className="h-4 w-4" />
                          {isSuspended ? 'Réactiver' : 'Bannir'}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDeleteUser(u)}
                          disabled={isDeleteBusy}
                          className="h-9 px-3 inline-flex items-center gap-2"
                          aria-label="Supprimer l'utilisateur"
                        >
                          <Trash2 className="h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {items.length === 0 && !loading ? (
          <div className="py-16 text-center text-sm text-[color:var(--foreground)]/60">Aucun resultat</div>
        ) : null}
        <div className="flex items-center justify-between px-4 py-3 text-xs text-[color:var(--foreground)]/70">
          <div>{loading ? 'Chargement...' : `${total} resultat${total>1?'s':''}`}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page<=1||loading} onClick={() => { const p=Math.max(1,page-1); setPage(p); getUsers({ page: p }).catch(()=>undefined) }} className="h-8 px-3">Precedent</Button>
            <div>Page {page} / {Math.max(1, Math.ceil(total/limit))}</div>
            <Button variant="outline" disabled={loading || items.length===0 || items.length<limit} onClick={() => { const n=page+1; setPage(n); getUsers({ page: n }).catch(()=>undefined) }} className="h-8 px-3">Suivant</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
