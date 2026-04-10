"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronLeft,
  ChevronRight,
  Coins,
  History,
  MoreHorizontal,
  RotateCcw,
  Search,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import UserHistoryModal from "@/components/admin/UserHistoryModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Role = { id: string; name: string; admin_access?: boolean };

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

type AdminStatusPayload = {
  rolesVirtual: boolean;
  usersFallback: boolean;
  usersSource: "legacy" | "directus" | "unknown";
};

type ConfirmState = {
  type: "ban" | "unban" | "delete" | "role";
  user: User;
  roleId?: string;
  roleName?: string;
} | null;

const LIMIT = 10;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminUsersPanel({
  onStatusChange,
}: {
  onStatusChange?: (status: AdminStatusPayload) => void;
}) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesVirtual, setRolesVirtual] = useState(false);
  const [usersSource, setUsersSource] =
    useState<AdminStatusPayload["usersSource"]>("unknown");
  const [usersFallback, setUsersFallback] = useState(false);
  const [items, setItems] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [banLoadingId, setBanLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});
  const [coinsModal, setCoinsModal] = useState<{
    userId: string;
    userName: string;
  } | null>(null);
  const [coinsAmount, setCoinsAmount] = useState("");
  const [coinsSending, setCoinsSending] = useState(false);
  const [q, setQ] = useState("");
  const [roleId, setRoleId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

  // Action menu open state (user id)
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  /* ── Fetch roles ── */
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

  useEffect(() => {
    onStatusChange?.({ rolesVirtual, usersFallback, usersSource });
  }, [rolesVirtual, usersFallback, usersSource, onStatusChange]);

  const roleOptions = useMemo(
    () => roles.map((r) => ({ value: r.id, label: r.name })),
    [roles],
  );
  const pageCount = Math.max(1, Math.ceil(total / LIMIT));

  /* ── Fetch users ── */
  const getUsers = async ({
    page: targetPage = page,
    query = q,
    role = roleId,
  }: {
    page?: number;
    query?: string;
    role?: string;
  } = {}) => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          q: query || undefined,
          roleId: role || undefined,
          page: targetPage,
          limit: LIMIT,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json?.error || "FETCH_FAILED");

      const rows: User[] = Array.isArray(json?.data) ? json.data : [];
      const metaSource = json?.meta?.source;
      const resolvedSource =
        metaSource === "legacy" || metaSource === "directus"
          ? metaSource
          : "unknown";

      setUsersSource(resolvedSource);
      setUsersFallback(Boolean(json?.meta?.fallback));
      setTotal(Number(json?.total || rows.length || 0));
      setPage(targetPage);

      const decorated = rows
        .map((user) => {
          const roleObj =
            typeof user.role === "object" && user.role
              ? (user.role as Role)
              : null;
          const rawName =
            (user as { _roleName?: string | null })._roleName ||
            roleObj?.name ||
            "";
          const normalized = String(rawName)
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
          const isFounder =
            normalized.includes("fondateur") || normalized.includes("founder");
          const isAdmin =
            isFounder ||
            normalized.includes("admin") ||
            roleObj?.admin_access === true;
          return {
            ...user,
            _roleName: rawName || null,
            _flags: { isFounder, isAdmin },
          } as User;
        })
        .sort((a, b) => {
          const wA = a._flags?.isFounder ? 0 : a._flags?.isAdmin ? 1 : 2;
          const wB = b._flags?.isFounder ? 0 : b._flags?.isAdmin ? 1 : 2;
          return wA - wB;
        });

      setItems(decorated);

      const nextRoles: Record<string, string> = {};
      for (const user of rows) {
        const rv =
          typeof user.role === "object"
            ? (user.role as { id?: string })?.id
            : user.role;
        if (rv) nextRoles[user.id] = String(rv);
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
    void getUsers({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Actions ── */

  const onSaveRole = async (userId: string, nextRoleId: string) => {
    setSavingId(userId);
    try {
      const response = await fetch("/api/admin/users/set-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId, roleId: nextRoleId }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json?.error || "Échec de la mise à jour du rôle");
        return;
      }
      const roleName = roles.find((r) => r.id === nextRoleId)?.name || nextRoleId;
      toast.success(`Rôle changé en "${roleName}"`);
      await getUsers();
    } catch {
      toast.error("Impossible de mettre à jour le rôle");
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleBan = async (user: User, ban: boolean) => {
    setBanLoadingId(user.id);
    try {
      const response = await fetch("/api/admin/users/ban", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: user.id, ban }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json?.error || "Impossible de mettre à jour le statut");
        return;
      }
      toast.success(
        ban
          ? `${formatFullName(user)} a été banni`
          : `${formatFullName(user)} a été réactivé`,
      );
      await getUsers();
    } catch {
      toast.error("Impossible de mettre à jour le statut");
    } finally {
      setBanLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    setDeleteLoadingId(user.id);
    try {
      const response = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ userId: user.id }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(json?.error || "Suppression impossible");
        return;
      }
      toast.success(`${formatFullName(user)} a été supprimé`);
      await getUsers();
    } catch {
      toast.error("Suppression impossible");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSendCoins = async () => {
    if (!coinsModal) return;
    const amount = parseInt(coinsAmount, 10);
    if (!amount || amount <= 0) {
      toast.error("Montant invalide");
      return;
    }
    setCoinsSending(true);
    try {
      const res = await fetch("/api/admin/users/coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: coinsModal.userId, amount }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Échec");
      toast.success(
        `${amount} HabbOneCoins envoyés à ${json?.nick || coinsModal.userName} (solde : ${json?.newBalance})`,
      );
      setCoinsModal(null);
      setCoinsAmount("");
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setCoinsSending(false);
    }
  };

  /* ── Confirm dialog handler ── */
  const executeConfirm = async () => {
    if (!confirmState) return;
    const { type, user, roleId: newRoleId } = confirmState;
    setConfirmState(null);

    if (type === "ban") await handleToggleBan(user, true);
    else if (type === "unban") await handleToggleBan(user, false);
    else if (type === "delete") await handleDeleteUser(user);
    else if (type === "role" && newRoleId) await onSaveRole(user.id, newRoleId);
  };

  const handleSearch = () => void getUsers({ page: 1 });

  const handleReset = () => {
    setQ("");
    setRoleId(undefined);
    setPage(1);
    void getUsers({ page: 1, query: "", role: undefined });
  };

  /* ── Confirm dialog content ── */
  const confirmDialogProps = useMemo(() => {
    if (!confirmState) return null;
    const name = formatFullName(confirmState.user);
    switch (confirmState.type) {
      case "ban":
        return {
          title: "Bannir cet utilisateur ?",
          description: `${name} ne pourra plus se connecter ni accéder au site. Cette action est réversible.`,
          confirmLabel: "Bannir",
          variant: "danger" as const,
          icon: <Ban className="h-5 w-5" />,
        };
      case "unban":
        return {
          title: "Réactiver cet utilisateur ?",
          description: `${name} pourra à nouveau se connecter et accéder au site.`,
          confirmLabel: "Réactiver",
          variant: "default" as const,
          icon: <RotateCcw className="h-5 w-5" />,
        };
      case "delete":
        return {
          title: "Supprimer définitivement ?",
          description: `${name} sera supprimé de façon irréversible. Ses contenus (articles, topics, commentaires) resteront mais ne seront plus liés à son compte.`,
          confirmLabel: "Supprimer",
          variant: "danger" as const,
          icon: <Trash2 className="h-5 w-5" />,
        };
      case "role":
        return {
          title: "Changer le rôle ?",
          description: `Le rôle de ${name} sera changé en "${confirmState.roleName || "nouveau rôle"}". Les permissions seront mises à jour immédiatement.`,
          confirmLabel: "Changer le rôle",
          variant: "warning" as const,
          icon: <Shield className="h-5 w-5" />,
        };
      default:
        return null;
    }
  }, [confirmState]);

  return (
    <div className="space-y-4">
      {/* ── Search bar ── */}
      <div className="rounded-[6px] border border-[#141433] bg-[#272746] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#BEBECE]" />
            <Input
              placeholder="Nom, email, pseudo..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="h-[45px] rounded-[4px] border-[#141433] bg-[#25254D] pl-10 text-white placeholder:text-[#BEBECE]/40"
            />
          </div>

          <Select
            value={roleId ?? "__ALL__"}
            onValueChange={(v) => {
              const next = v === "__ALL__" ? undefined : v;
              setRoleId(next);
              void getUsers({ page: 1, role: next });
            }}
          >
            <SelectTrigger className="h-[45px] w-full rounded-[4px] border-[#141433] bg-[#25254D] text-white sm:w-[200px]">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent className="border-[#141433] bg-[#25254D] text-white">
              <SelectItem value="__ALL__">Tous les rôles</SelectItem>
              {roleOptions.map((o) => (
                <SelectItem key={o.value} value={String(o.value)}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="h-[45px] rounded-[4px] bg-[#2596FF] px-5 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#2976E8]"
            >
              {loading ? "..." : "Rechercher"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={loading}
              className="h-[45px] rounded-[4px] border-[#141433] bg-[#25254D] px-4 text-white hover:bg-[#303060]"
            >
              Vider
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#BEBECE]">
          <span>{total} utilisateur(s)</span>
          <span>·</span>
          <span>
            page {page}/{pageCount}
          </span>
        </div>
      </div>

      {/* ── Empty state ── */}
      {items.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-[6px] border border-dashed border-[#303060] bg-[#272746] p-10 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#1F1F3E] text-[#BEBECE]">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-[15px] font-bold text-white">
            Aucun utilisateur trouvé
          </p>
          <p className="max-w-sm text-[13px] text-[#BEBECE]">
            Essaie une recherche plus large ou retire le filtre de rôle.
          </p>
        </div>
      )}

      {/* ── User list ── */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((user) => {
            const currentRoleId =
              typeof user.role === "object"
                ? (user.role as { id?: string })?.id
                : user.role;
            const selectedRole =
              selectedRoles[user.id] ??
              (currentRoleId ? String(currentRoleId) : undefined);
            const isSaving = savingId === user.id;
            const isBanBusy = banLoadingId === user.id;
            const isDeleteBusy = deleteLoadingId === user.id;
            const isSuspended =
              String(user.status || "").toLowerCase() === "suspended";
            const displayRole =
              (user._roleName && user._roleName.trim()) ||
              (typeof user.role === "object"
                ? ((user.role as { name?: string }).name || "")
                : "") ||
              "Sans rôle";

            return (
              <article
                key={user.id}
                className="rounded-[6px] border border-[#141433] bg-[#272746] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* User info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">
                        {formatFullName(user)}
                      </h3>
                      <Badge
                        className={
                          isSuspended
                            ? "border-0 bg-red-500/20 text-red-400"
                            : "border-0 bg-green-500/20 text-green-400"
                        }
                      >
                        {isSuspended ? "Suspendu" : "Actif"}
                      </Badge>
                      {user._flags?.isFounder && (
                        <Badge className="border-0 bg-[#FFC800]/15 text-[#FFC800]">
                          Fondateur
                        </Badge>
                      )}
                      {user._flags?.isAdmin && !user._flags?.isFounder && (
                        <Badge className="border-0 bg-[#2596FF]/15 text-[#2596FF]">
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-[#BEBECE]">
                      {user.email || "Email non renseigné"} · {displayRole}
                    </p>
                  </div>

                  {/* ── Actions dropdown ── */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setMenuOpen(menuOpen === user.id ? null : user.id)
                      }
                      className="grid h-[36px] w-[36px] place-items-center rounded-[4px] border border-[#141433] bg-[#25254D] text-[#BEBECE] transition-colors hover:bg-[#303060] hover:text-white"
                      aria-label="Actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>

                    {menuOpen === user.id && (
                      <>
                        {/* Close on click outside */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setMenuOpen(null)}
                          role="presentation"
                        />
                        <div className="absolute right-0 top-[40px] z-50 w-[200px] rounded-[6px] border border-[#141433] bg-[#25254D] py-1 shadow-xl">
                          {/* Role selector */}
                          <div className="px-2 py-1.5">
                            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#BEBECE]/60">
                              Rôle
                            </label>
                            <Select
                              value={selectedRole}
                              onValueChange={(value) => {
                                setSelectedRoles((c) => ({
                                  ...c,
                                  [user.id]: value,
                                }));
                                const roleName =
                                  roles.find((r) => r.id === value)?.name ||
                                  value;
                                setConfirmState({
                                  type: "role",
                                  user,
                                  roleId: value,
                                  roleName,
                                });
                                setMenuOpen(null);
                              }}
                              disabled={isSaving}
                            >
                              <SelectTrigger className="h-[32px] w-full rounded-[4px] border-[#141433] bg-[#1F1F3E] text-[11px] text-white">
                                <SelectValue placeholder="Rôle" />
                              </SelectTrigger>
                              <SelectContent className="border-[#141433] bg-[#25254D] text-white">
                                {roleOptions.map((o) => (
                                  <SelectItem
                                    key={o.value}
                                    value={String(o.value)}
                                  >
                                    {o.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="my-1 h-px bg-white/10" />

                          {/* History */}
                          <UserHistoryModal
                            userId={user.id}
                            userName={formatFullName(user)}
                            trigger={
                              <button
                                type="button"
                                className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#BEBECE] transition-colors hover:bg-[#303060] hover:text-white"
                                onClick={() => setMenuOpen(null)}
                              >
                                <History className="h-3.5 w-3.5" />
                                Historique
                              </button>
                            }
                          />

                          {/* Coins */}
                          <button
                            type="button"
                            onClick={() => {
                              setCoinsModal({
                                userId: user.id,
                                userName: formatFullName(user),
                              });
                              setCoinsAmount("");
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-[#FFC800] transition-colors hover:bg-[#303060]"
                          >
                            <Coins className="h-3.5 w-3.5" />
                            Envoyer des coins
                          </button>

                          <div className="my-1 h-px bg-white/10" />

                          {/* Ban/Unban */}
                          <button
                            type="button"
                            disabled={isBanBusy}
                            onClick={() => {
                              setConfirmState({
                                type: isSuspended ? "unban" : "ban",
                                user,
                              });
                              setMenuOpen(null);
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-[12px] transition-colors hover:bg-[#303060] ${
                              isSuspended
                                ? "text-green-400"
                                : "text-orange-400"
                            }`}
                          >
                            {isSuspended ? (
                              <RotateCcw className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5" />
                            )}
                            {isSuspended ? "Réactiver" : "Bannir"}
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            disabled={isDeleteBusy}
                            onClick={() => {
                              setConfirmState({ type: "delete", user });
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-400 transition-colors hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Supprimer
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between rounded-[6px] border border-[#141433] bg-[#272746] px-4 py-3 text-sm text-[#BEBECE]">
        <span>{loading ? "Chargement..." : `${total} résultat(s)`}</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={page <= 1 || loading}
            onClick={() => void getUsers({ page: Math.max(1, page - 1) })}
            className="h-[36px] w-[36px] rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[60px] text-center text-xs">
            {page}/{pageCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={loading || items.length === 0 || items.length < LIMIT}
            onClick={() => void getUsers({ page: page + 1 })}
            className="h-[36px] w-[36px] rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Coins Modal ── */}
      {coinsModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setCoinsModal(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-[400px] rounded-[8px] border border-[#1F1F3E] bg-[#272746] p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setCoinsModal(null);
            }}
          >
            <h3 className="text-[16px] font-bold text-white">
              Envoyer des HabbOneCoins
            </h3>
            <p className="mt-1 text-[13px] text-[#BEBECE]">
              Destinataire :{" "}
              <span className="font-bold text-[#2596FF]">
                {coinsModal.userName}
              </span>
            </p>

            <div className="mt-4">
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/70">
                Montant
              </label>
              <input
                type="number"
                min={1}
                max={100000}
                value={coinsAmount}
                onChange={(e) => setCoinsAmount(e.target.value)}
                placeholder="Ex : 500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendCoins();
                  if (e.key === "Escape") setCoinsModal(null);
                }}
                className="w-full rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2.5 text-[14px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#FFC800] focus:outline-none"
              />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {[10, 50, 100, 500, 1000].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setCoinsAmount(String(a))}
                  className="rounded-[4px] bg-white/5 px-3 py-1.5 text-[12px] font-bold text-[#FFC800] transition hover:bg-white/10"
                >
                  +{a}
                </button>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCoinsModal(null)}
                className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] px-4 text-[13px] font-bold text-white transition-colors hover:bg-[#303060]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSendCoins}
                disabled={
                  coinsSending || !coinsAmount || parseInt(coinsAmount, 10) <= 0
                }
                className="h-[36px] rounded-[4px] bg-[#FFC800] px-4 text-[13px] font-bold text-black transition-colors hover:bg-[#E6B400] disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Coins className="h-3.5 w-3.5" />
                  {coinsSending ? "Envoi..." : "Envoyer"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Dialog ── */}
      {confirmDialogProps && (
        <ConfirmDialog
          open={!!confirmState}
          onConfirm={executeConfirm}
          onCancel={() => setConfirmState(null)}
          loading={
            (confirmState?.type === "ban" || confirmState?.type === "unban"
              ? banLoadingId
              : confirmState?.type === "delete"
                ? deleteLoadingId
                : savingId) === confirmState?.user.id
          }
          {...confirmDialogProps}
        />
      )}
    </div>
  );
}

function formatFullName(user: User) {
  const fullName = [user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return fullName || user.email || `Utilisateur ${user.id}`;
}
