"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Package,
  Pencil,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  Truck,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  AdminButton,
  AdminEmptyState,
  AdminField,
  AdminImageUpload,
  AdminIconButton,
  AdminInput,
  AdminPanel,
  AdminPanelHeader,
  AdminTable,
  AdminTableShell,
  AdminTextarea,
  adminTdClassName,
  adminThClassName,
  adminTrClassName,
} from "@/components/admin/ui";
import type { ShopItem, ShopOrder } from "@/types/shop";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { mediaUrl } from "@/lib/media-url";

const SHOP_IMAGE_FALLBACK = "/img/box.png";

function shopImageSrc(value?: string | null) {
  const raw = value?.trim() || "";
  return mediaUrl(raw) || raw || SHOP_IMAGE_FALLBACK;
}

function setShopImageFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  if (event.currentTarget.src.endsWith(SHOP_IMAGE_FALLBACK)) return;
  event.currentTarget.src = SHOP_IMAGE_FALLBACK;
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EditState = {
  id: string | null;
  nome: string;
  descricao: string;
  imagem: string;
  preco: number;
  estoque: number;
  status: string;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminShopPanel() {
  const [tab, setTab] = useState<"items" | "orders">("items");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-[6px] bg-[#141433]/50 p-1">
        <AdminButton
          tone={tab === "items" ? "primary" : "ghost"}
          size="sm"
          icon={<Package className="h-4 w-4" />}
          onClick={() => setTab("items")}
        >
          Articles
        </AdminButton>
        <AdminButton
          tone={tab === "orders" ? "primary" : "ghost"}
          size="sm"
          icon={<ShoppingBag className="h-4 w-4" />}
          onClick={() => setTab("orders")}
        >
          Commandes
        </AdminButton>
      </div>

      {tab === "items" && <ItemsTab />}
      {tab === "orders" && <OrdersTab />}
    </div>
  );
}

/* ================================================================== */
/*  ITEMS TAB                                                          */
/* ================================================================== */

function ItemsTab() {
  const {
    data,
    loading,
    refetch: fetchItems,
  } = useAdminFetch<ShopItem[]>('/api/admin/shop?view=items', {
    select: (raw) => {
      const payload = raw as { data?: ShopItem[] } | null;
      return payload?.data ?? [];
    },
    onError: () => toast.error('Erreur de chargement'),
  });
  const items = data ?? [];
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const startCreate = () => {
    setEdit({ id: null, nome: "", descricao: "", imagem: "", preco: 0, estoque: 1, status: "ativo" });
  };

  const startEdit = (item: ShopItem) => {
    setEdit({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || "",
      imagem: item.imagem,
      preco: item.preco,
      estoque: item.estoque,
      status: item.status,
    });
  };

  const handleSave = async () => {
    if (!edit) return;
    if (!edit.nome.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (!edit.imagem.trim()) {
      toast.error("L'image est requise");
      return;
    }
    setSaving(true);
    try {
      const action = edit.id ? "update" : "create";
      const body: Record<string, unknown> = {
        action,
        nome: edit.nome.trim(),
        descricao: edit.descricao.trim(),
        imagem: edit.imagem.trim(),
        preco: edit.preco,
        estoque: edit.estoque,
        status: edit.status,
      };
      if (edit.id) body.id = edit.id;

      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur");
      toast.success(edit.id ? "Article mis à jour" : "Article créé");
      setEdit(null);
      fetchItems();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (deleteConfirmId === null) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteConfirmId }),
      });
      if (!res.ok) throw new Error("Échec suppression");
      toast.success("Article supprimé");
      fetchItems();
    } catch {
      toast.error("Erreur suppression");
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = async (item: ShopItem) => {
    const newStatus = item.status === "ativo" ? "inativo" : "ativo";
    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: item.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Échec");
      toast.success(newStatus === "ativo" ? "Article activé" : "Article désactivé");
      fetchItems();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <>
      {/* Header + Add button */}
      <AdminPanelHeader
        title="Articles de la boutique"
        description={`${items.length} article${items.length !== 1 ? "s" : ""}`}
        actions={
          <AdminButton tone="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={startCreate}>
            Ajouter un article
          </AdminButton>
        }
      />

      {/* Edit/Create form */}
      {edit && (
        <AdminPanel tone="accent" className="space-y-4">
          <h4 className="text-[14px] font-bold text-white">
            {edit.id ? "Modifier l'article" : "Nouvel article"}
          </h4>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
            {/* Left: fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminField label="Nom">
                  <AdminInput
                    type="text"
                    value={edit.nome}
                    onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                    placeholder="Nom du mobi"
                  />
                </AdminField>
                <AdminField label="Prix (coins)">
                  <AdminInput
                    type="number"
                    min={0}
                    value={edit.preco}
                    onChange={(e) => setEdit({ ...edit, preco: Number(e.target.value) || 0 })}
                  />
                </AdminField>
                <AdminField label="Stock">
                  <AdminInput
                    type="number"
                    min={0}
                    value={edit.estoque}
                    onChange={(e) => setEdit({ ...edit, estoque: Number(e.target.value) || 0 })}
                  />
                </AdminField>
              </div>
              <AdminField label="Description (optionnel)">
                <AdminTextarea
                  value={edit.descricao}
                  onChange={(e) => setEdit({ ...edit, descricao: e.target.value })}
                  placeholder="Description du mobi..."
                  rows={2}
                />
              </AdminField>
            </div>

            {/* Right: image upload */}
            <AdminImageUpload
              value={edit.imagem}
              onChange={(url) => setEdit({ ...edit, imagem: url })}
              endpoint="/api/admin/upload"
              pixelated
              resolvePreview={shopImageSrc}
              onPreviewError={setShopImageFallback}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <AdminButton
              tone="primary"
              icon={<Save className="h-3.5 w-3.5" />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </AdminButton>
            <AdminButton
              tone="ghost"
              icon={<X className="h-3.5 w-3.5" />}
              onClick={() => setEdit(null)}
            >
              Annuler
            </AdminButton>
          </div>
        </AdminPanel>
      )}

      {/* Items list */}
      {loading ? (
        <div className="py-8 text-center text-[13px] text-admin-text-tertiary">Chargement...</div>
      ) : items.length === 0 ? (
        <AdminEmptyState
          icon={<Package className="h-7 w-7" />}
          title="Aucun article dans la boutique"
          description="Ajoute un premier article pour l'afficher côté boutique."
        />
      ) : (
        <AdminTableShell>
          <AdminTable className="min-w-[600px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#141433]/60">
                <th scope="col" className={adminThClassName}>Article</th>
                <th scope="col" className={adminThClassName}>Prix</th>
                <th scope="col" className={adminThClassName}>Stock</th>
                <th scope="col" className={adminThClassName}>Statut</th>
                <th scope="col" className={`${adminThClassName} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={adminTrClassName}>
                  <td className={adminTdClassName}>
                    <div className="flex items-center gap-3">
                      <div className="h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[4px] bg-[#303060]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={shopImageSrc(item.imagem)}
                          alt={item.nome}
                          className="h-full w-full object-contain image-pixelated"
                          onError={setShopImageFallback}
                        />
                      </div>
                      <span className="text-[13px] font-semibold text-white">{item.nome}</span>
                    </div>
                  </td>
                  <td className={`${adminTdClassName} text-[13px] font-bold text-admin-brand-yellow`}>{item.preco} coins</td>
                  <td className={`${adminTdClassName} text-[13px] text-admin-text-secondary`}>{item.estoque}</td>
                  <td className={adminTdClassName}>
                    <span className={`text-[11px] font-bold uppercase ${item.status === "ativo" ? "text-[#0FD52F]" : "text-[#F92330]"}`}>
                      {item.status === "ativo" ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className={adminTdClassName}>
                    <div className="flex items-center justify-end gap-1">
                      <AdminIconButton label="Modifier" tone="blue" onClick={() => startEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </AdminIconButton>
                      <AdminIconButton label={item.status === "ativo" ? "Désactiver" : "Activer"} tone="yellow" onClick={() => handleToggleStatus(item)}>
                        {item.status === "ativo" ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </AdminIconButton>
                      <AdminIconButton label="Supprimer" tone="red" onClick={() => setDeleteConfirmId(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </AdminIconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      )}

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title="Supprimer cet article ?"
        description="L'article sera retiré de la boutique. Les commandes existantes ne seront pas affectées."
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteLoading}
        icon={<Trash2 className="h-5 w-5" />}
      />
    </>
  );
}

/* ================================================================== */
/*  ORDERS TAB                                                         */
/* ================================================================== */

function OrdersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ordersUrl = useMemo(() => {
    const params = new URLSearchParams({ view: "orders", page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    return `/api/admin/shop?${params}`;
  }, [page, statusFilter]);

  const {
    data,
    loading,
    refetch: reloadOrders,
  } = useAdminFetch<{ orders: ShopOrder[]; total: number }>(ordersUrl, {
    select: (raw) => {
      const payload = raw as { data?: ShopOrder[]; total?: number } | null;
      return { orders: payload?.data ?? [], total: payload?.total ?? 0 };
    },
    onError: () => toast.error('Erreur de chargement'),
  });

  // Mirror the hook data into a local state so we can mutate individual rows
  // (optimistic/dynamic updates after status changes) without waiting for a
  // full reload.
  const [localOrders, setLocalOrders] = useState<ShopOrder[]>([]);
  useEffect(() => {
    setLocalOrders(data?.orders ?? []);
  }, [data?.orders]);

  const orders = localOrders;
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  const fetchOrders = useCallback(
    (p = 1, status = statusFilter) => {
      setStatusFilter(status);
      setPage(p);
      // url change triggers the useAdminFetch effect — refetch is redundant for the common case
      return Promise.resolve();
    },
    [statusFilter],
  );

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    // Capture la ligne actuelle pour pouvoir rollback en cas d'échec
    const previous = orders.find((o) => o.id === orderId);
    if (!previous) return;

    setUpdatingId(orderId);

    // Optimistic update — l'utilisateur voit le changement instantanément.
    // Le serveur est mis à jour en arrière-plan, sans full refetch.
    setLocalOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus as ShopOrder["status"] } : o)),
    );

    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_order", id: orderId, status: newStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((json as { error?: string })?.error || `HTTP ${res.status}`);
      }

      // Si le serveur renvoie la row mise à jour, on la merge pour rester
      // synchronisé (ex: si `delivered_at` est ajouté côté API).
      const updated = (json as { data?: ShopOrder })?.data;
      if (updated) {
        setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...updated } : o)));
      }

      toast.success(
        newStatus === "entregue" ? "Commande marquée comme livrée" :
        newStatus === "cancelado" ? "Commande annulée" : "Statut mis à jour"
      );
    } catch (e: unknown) {
      // Rollback : on restaure l'état d'origine de la ligne
      setLocalOrders((prev) => prev.map((o) => (o.id === orderId ? previous : o)));
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      toast.error(`Erreur: ${msg}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = useMemo(() => orders.filter((o) => o.status === "pendente").length, [orders]);

  return (
    <>
      {/* Stats */}
      <div className="flex items-center gap-4">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-[6px] bg-[#FFC800]/10 px-3 py-2">
            <Clock className="h-4 w-4 text-[#FFC800]" />
            <span className="text-[12px] font-bold text-[#FFC800]">{pendingCount} commande{pendingCount > 1 ? "s" : ""} en attente</span>
          </div>
        )}

        {/* Status filter */}
        <div className="ml-auto flex items-center gap-2">
          {["", "pendente", "entregue", "cancelado"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); fetchOrders(1, s); }}
              className={`rounded-[4px] px-3 py-1.5 text-[11px] font-bold uppercase transition-colors ${
                statusFilter === s ? "bg-[#2596FF] text-white" : "bg-white/5 text-admin-text-tertiary hover:text-white"
              }`}
            >
              {s === "" ? "Toutes" : s === "pendente" ? "En attente" : s === "entregue" ? "Livrées" : "Annulées"}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="py-8 text-center text-[13px] text-admin-text-tertiary">Chargement...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-white/10 bg-[#141433]/30 p-12 text-center">
          <ShoppingBag className="h-8 w-8 text-[#BEBECE]/20" />
          <p className="text-[13px] text-admin-text-tertiary">Aucune commande</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-white/5">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[#141433]/60">
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">#</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">Acheteur</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">Article</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">Prix</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">Statut</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">Date</th>
                <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-admin-text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${order.status === "pendente" ? "bg-[#FFC800]/[0.03]" : ""}`}>
                  <td className="px-4 py-3 text-[12px] text-admin-text-tertiary">#{order.id}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-white">{order.user_nick || `#${order.user_id}`}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {order.item_imagem && (
                        <div className="h-[28px] w-[28px] shrink-0 overflow-hidden rounded-[3px] bg-[#303060]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={shopImageSrc(order.item_imagem)}
                            alt=""
                            className="h-full w-full object-contain image-pixelated"
                            onError={setShopImageFallback}
                          />
                        </div>
                      )}
                      <span className="text-[13px] text-admin-text-secondary">{order.item_nome || `Item #${order.item_id}`}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-bold text-[#FFC800]">{order.preco}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-admin-text-tertiary">
                    {"—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {order.status === "pendente" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, "entregue")}
                            disabled={updatingId === order.id}
                            className="inline-flex items-center gap-1 rounded-[4px] bg-[#0FD52F]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#0FD52F] transition-colors hover:bg-[#0FD52F]/25 disabled:opacity-50"
                            title="Marquer comme livré"
                          >
                            <Truck className="h-3 w-3" />
                            Livré
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(order.id, "cancelado")}
                            disabled={updatingId === order.id}
                            className="inline-flex items-center gap-1 rounded-[4px] bg-[#F92330]/15 px-2.5 py-1.5 text-[11px] font-bold text-[#F92330] transition-colors hover:bg-[#F92330]/25 disabled:opacity-50"
                            title="Annuler la commande"
                          >
                            <X className="h-3 w-3" />
                            Annuler
                          </button>
                        </>
                      )}
                      {order.status === "entregue" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#0FD52F]/70">
                          <Check className="h-3 w-3" /> Livré
                        </span>
                      )}
                      {order.status === "cancelado" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#F92330]/70">
                          <X className="h-3 w-3" /> Annulé
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-admin-text-tertiary">{total} commande{total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1 || loading} onClick={() => fetchOrders(page - 1)} className="grid h-[32px] w-[32px] place-items-center rounded-[4px] text-admin-text-tertiary hover:bg-white/5 hover:text-white disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-[12px] text-admin-text-tertiary">{page}/{pageCount}</span>
            <button type="button" disabled={page >= pageCount || loading} onClick={() => fetchOrders(page + 1)} className="grid h-[32px] w-[32px] place-items-center rounded-[4px] text-admin-text-tertiary hover:bg-white/5 hover:text-white disabled:opacity-30">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Order status badge                                                 */
/* ------------------------------------------------------------------ */

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pendente: { label: "En attente", cls: "bg-[#FFC800]/15 text-[#FFC800]" },
    entregue: { label: "Livré", cls: "bg-[#0FD52F]/15 text-[#0FD52F]" },
    cancelado: { label: "Annulé", cls: "bg-[#F92330]/15 text-[#F92330]" },
  };
  const c = config[status] ?? { label: status, cls: "bg-white/5 text-[#BEBECE]" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${c.cls}`}>
      {c.label}
    </span>
  );
}
