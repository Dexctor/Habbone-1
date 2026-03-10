"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Ban,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import UserHistoryModal from "@/components/admin/UserHistoryModal";

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
  const [source, setSource] = useState<SourceOption>("legacy");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/admin/roles/list", { cache: "no-store" })
      .then((response) => response.json())
      .then((json) => {
        setRoles(Array.isArray(json?.data) ? json.data : []);
        setRolesVirtual(Boolean(json?.meta?.virtual));
      })
      .catch(() => {
        setRoles([]);
        setRolesVirtual(false);
      });
  }, []);

  const roleOptions = useMemo(() => roles.map((role) => ({ value: role.id, label: role.name })), [roles]);

  useEffect(() => {
    onStatusChange?.({ rolesVirtual, usersFallback, usersSource });
  }, [rolesVirtual, usersFallback, usersSource, onStatusChange]);

  const getUsers = async ({
    page: targetPage = page,
    source: targetSource = source,
    query = q,
    role = roleId,
    stat = status,
  } = {}) => {
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
        .map((user) => {
          const roleObj = typeof user.role === "object" && user.role ? (user.role as any) : null;
          const rawName = (user as any)._roleName || roleObj?.name || "";
          const norm = String(rawName).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
          const isFounder = norm.includes("fondateur") || norm.includes("founder");
          const isAdmin = isFounder || norm.includes("admin") || roleObj?.admin_access === true;
          return { ...user, _roleName: rawName || null, _flags: { isFounder, isAdmin } } as User;
        })
        .sort((a, b) => {
          const weightA = a._flags?.isFounder ? 0 : a._flags?.isAdmin ? 1 : 2;
          const weightB = b._flags?.isFounder ? 0 : b._flags?.isAdmin ? 1 : 2;
          return weightA - weightB;
        });

      setItems(decorated);
      setTotal(Number(json?.total || rows.length || 0));
      setPage(targetPage);

      const nextRoles: Record<string, string> = {};
      for (const user of rows) {
        const roleValue = typeof user.role === "object" ? (user.role as any)?.id : (user.role as any);
        if (roleValue) nextRoles[user.id] = String(roleValue);
      }
      setSelectedRoles(nextRoles);
    } catch {
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
    if (!confirm(ban ? `Bannir ${user.email || "cet utilisateur"} ?` : `Reactiver ${user.email || "cet utilisateur"} ?`)) return;
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
  const formatFullName = (user: User) => [user.first_name, user.last_name].filter(Boolean).join(" ") || "-";

  return (
    <div className="space-y-5 text-[color:var(--text-100)]">
      <section className="rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,31,62,0.92),rgba(20,20,51,0.98))] p-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold text-white">Liste utilisateurs</h3>
              <Badge className="border-0 bg-white/8 text-white/72">{total} utilisateur(s)</Badge>
            </div>
            <p className="mt-2 text-sm text-white/55">Recherche, roles, historique et moderation dans une surface type dashboard.</p>
          </div>

          <div className="grid w-full gap-3 xl:w-auto xl:grid-cols-[minmax(280px,360px)_150px_150px_180px_auto]">
            <div className="space-y-2">
              <Label htmlFor="admin-users-search" className="text-xs uppercase tracking-[0.18em] text-white/45">Recherche</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <Input
                  id="admin-users-search"
                  placeholder="Nom, email, pseudo"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch();
                    }
                  }}
                  className="h-11 rounded-2xl border-white/10 bg-black/20 pl-10 text-white placeholder:text-white/35"
                />
              </div>
            </div>

            <SelectBlock label="Source" id="admin-users-source">
              <Select value={source} onValueChange={(v) => setSource(v as SourceOption)}>
                <SelectTrigger id="admin-users-source" className="h-11 rounded-2xl border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1f1f3e] text-white">
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="legacy">Legacy</SelectItem>
                  <SelectItem value="directus">Directus</SelectItem>
                </SelectContent>
              </Select>
            </SelectBlock>

            <SelectBlock label="Statut" id="admin-users-status">
              <Select value={status ?? "__ALL__"} onValueChange={(v) => setStatus(v === "__ALL__" ? undefined : v)}>
                <SelectTrigger id="admin-users-status" className="h-11 rounded-2xl border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1f1f3e] text-white">
                  <SelectItem value="__ALL__">Tous</SelectItem>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="suspended">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </SelectBlock>

            <SelectBlock label="Role" id="admin-users-role">
              <Select value={roleId ?? "__ALL__"} onValueChange={(v) => setRoleId(v === "__ALL__" ? undefined : v)}>
                <SelectTrigger id="admin-users-role" className="h-11 rounded-2xl border-white/10 bg-black/20 text-white">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="border-white/10 bg-[#1f1f3e] text-white">
                  <SelectItem value="__ALL__">Tous</SelectItem>
                  {roleOptions.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SelectBlock>

            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} disabled={loading} className="h-11 rounded-2xl bg-[#2596ff] px-4 text-white hover:bg-[#1e84e0]">
                {loading ? "Chargement..." : "Appliquer"}
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={loading} className="h-11 rounded-2xl border-white/10 bg-white/5 px-4 text-white hover:bg-white/10">
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(31,31,62,0.92),rgba(20,20,51,0.98))]">
        <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-white">user list</span>
            <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/55">{total} user</span>
          </div>
          <span className="text-xs uppercase tracking-[0.18em] text-white/40">{loading ? "Chargement" : "Live data"}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm text-white/78">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.16em] text-white/38">
              <tr>
                <th className="px-4 py-3 text-left font-medium">User name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Statut</th>
                <th className="px-4 py-3 text-left font-medium">Source</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((user) => {
                const currentRoleId = typeof user.role === "object" ? (user.role as any)?.id : (user.role as any);
                const selected = selectedRoles[user.id] ?? currentRoleId ?? "";
                const isSaving = savingId === user.id;
                const isBanBusy = banLoadingId === user.id;
                const isDeleteBusy = deleteLoadingId === user.id;
                const isSuspended = String(user.status || "").toLowerCase() === "suspended";
                const displayRole = (user._roleName && user._roleName.trim()) || (typeof user.role === "object" ? ((user.role as any)?.name || "") : "") || "";
                const isFounder = !!user._flags?.isFounder;
                const isAdmin = !!user._flags?.isAdmin && !isFounder;
                const initials = formatFullName(user).split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

                return (
                  <tr key={user.id} className="border-t border-white/6 align-top">
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-semibold text-[#ffd772]">
                          {initials || "--"}
                        </div>
                        <div className="space-y-1">
                          <div className="font-medium text-white">{formatFullName(user)}</div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-white/50">
                            <span>ID {user.id}</span>
                            {isFounder ? <Badge className="border-0 bg-[#ffd772]/14 text-[#ffd772]">Fondateur</Badge> : null}
                            {isAdmin ? <Badge className="border-0 bg-[#7bc3ff]/14 text-[#7bc3ff]">Admin</Badge> : null}
                            {displayRole ? <span>{displayRole}</span> : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-white/62">{user.email || "-"}</td>
                    <td className="px-4 py-3.5">
                      <Select
                        value={String(selected || "")}
                        onValueChange={async (value) => {
                          setSelectedRoles((map) => ({ ...map, [user.id]: value }));
                          await onSaveRole(user.id, value);
                        }}
                        disabled={isSaving}
                      >
                        <SelectTrigger className="h-10 min-w-40 rounded-xl border-white/10 bg-black/20 text-white">
                          <SelectValue placeholder="Selectionner" />
                        </SelectTrigger>
                        <SelectContent className="border-white/10 bg-[#1f1f3e] text-white">
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge className={isSuspended ? "border-0 bg-[#ff8aa1]/14 text-[#ffb4c3]" : "border-0 bg-[#67d88b]/14 text-[#67d88b]"}>
                        {isSuspended ? "Suspendu" : "Actif"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3.5 capitalize text-white/50">{user._source || "-"}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-2">
                        <UserHistoryModal userId={user.id} userName={formatFullName(user)} />
                        <Button
                          variant={isSuspended ? "secondary" : "outline"}
                          onClick={() => handleToggleBan(user, !isSuspended)}
                          disabled={isBanBusy}
                          className="h-10 rounded-xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
                          aria-label={isSuspended ? "Reactiver utilisateur" : "Bannir utilisateur"}
                        >
                          <Ban className="h-4 w-4" />
                          {isSuspended ? "Reactiver" : "Bannir"}
                        </Button>
                        <Button variant="destructive" onClick={() => handleDeleteUser(user)} disabled={isDeleteBusy} className="h-10 rounded-xl px-3" aria-label="Supprimer l'utilisateur">
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

        {items.length === 0 && !loading ? <div className="py-16 text-center text-sm text-white/48">Aucun resultat</div> : null}

        <div className="flex flex-col gap-3 border-t border-white/8 px-4 py-4 text-xs text-white/48 sm:flex-row sm:items-center sm:justify-between">
          <div>{loading ? "Chargement..." : `${total} resultat(s) · page ${page}/${pageCount}`}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => {
                const prevPage = Math.max(1, page - 1);
                setPage(prevPage);
                getUsers({ page: prevPage }).catch(() => undefined);
              }}
              className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
            >
              Precedent
            </Button>
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/72">{page} / {pageCount}</div>
            <Button
              variant="outline"
              disabled={loading || items.length === 0 || items.length < limit}
              onClick={() => {
                const nextPage = page + 1;
                setPage(nextPage);
                getUsers({ page: nextPage }).catch(() => undefined);
              }}
              className="h-9 rounded-xl border-white/10 bg-white/5 px-3 text-white hover:bg-white/10"
            >
              Suivant
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

function SelectBlock({
  label,
  id,
  children,
}: {
  label: string;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</Label>
      {children}
    </div>
  );
}
