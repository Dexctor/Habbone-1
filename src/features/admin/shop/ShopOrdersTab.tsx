"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, ShoppingBag, Truck, X } from "lucide-react";
import { toast } from "sonner";
import {
  AdminButton,
  AdminEmptyState,
  AdminTable,
  AdminTableShell,
  adminTdClassName,
  adminThClassName,
  adminTrClassName,
} from "@/components/admin/ui";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import type { ShopOrder } from "@/types/shop";
import { setShopImageFallback, shopImageSrc } from "./shop-image";

export function ShopOrdersTab() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const ordersUrl = useMemo(() => {
    const params = new URLSearchParams({ view: "orders", page: String(page) });
    if (statusFilter) params.set("status", statusFilter);
    return `/api/admin/shop?${params}`;
  }, [page, statusFilter]);

  const { data, loading } = useAdminFetch<{ orders: ShopOrder[]; total: number }>(ordersUrl, {
    select: (raw) => {
      const payload = raw as { data?: ShopOrder[]; total?: number } | null;
      return { orders: payload?.data ?? [], total: payload?.total ?? 0 };
    },
    onError: () => toast.error("Erreur de chargement"),
  });

  const [localOrders, setLocalOrders] = useState<ShopOrder[]>([]);
  useEffect(() => {
    setLocalOrders(data?.orders ?? []);
  }, [data?.orders]);

  const orders = localOrders;
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / 20));

  const fetchOrders = useCallback(
    (nextPage = 1, status = statusFilter) => {
      setStatusFilter(status);
      setPage(nextPage);
    },
    [statusFilter],
  );

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const previous = orders.find((order) => order.id === orderId);
    if (!previous) return;

    setUpdatingId(orderId);
    setLocalOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus as ShopOrder["status"] } : order)),
    );

    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_order", id: orderId, status: newStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error((json as { error?: string })?.error || `HTTP ${res.status}`);

      const updated = (json as { data?: ShopOrder })?.data;
      if (updated) {
        setLocalOrders((prev) => prev.map((order) => (order.id === orderId ? { ...order, ...updated } : order)));
      }

      toast.success(
        newStatus === "entregue"
          ? "Commande marquée comme livrée"
          : newStatus === "cancelado"
            ? "Commande annulée"
            : "Statut mis à jour",
      );
    } catch (error) {
      setLocalOrders((prev) => prev.map((order) => (order.id === orderId ? previous : order)));
      toast.error(`Erreur: ${error instanceof Error ? error.message : "Erreur inconnue"}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingCount = useMemo(() => orders.filter((order) => order.status === "pendente").length, [orders]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {pendingCount > 0 && (
          <div className="flex items-center gap-2 rounded-[6px] bg-admin-brand-yellow/10 px-3 py-2">
            <Clock className="h-4 w-4 text-admin-brand-yellow" />
            <span className="text-[12px] font-bold text-admin-brand-yellow">
              {pendingCount} commande{pendingCount > 1 ? "s" : ""} en attente
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          {["", "pendente", "entregue", "cancelado"].map((status) => (
            <AdminButton
              key={status}
              tone={statusFilter === status ? "primary" : "ghost"}
              size="sm"
              onClick={() => fetchOrders(1, status)}
            >
              {status === "" ? "Toutes" : status === "pendente" ? "En attente" : status === "entregue" ? "Livrées" : "Annulées"}
            </AdminButton>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-8 text-center text-[13px] text-admin-text-tertiary">Chargement...</div>
      ) : orders.length === 0 ? (
        <AdminEmptyState
          icon={<ShoppingBag className="h-7 w-7" />}
          title="Aucune commande"
          description="Les commandes boutique apparaîtront ici."
        />
      ) : (
        <AdminTableShell>
          <AdminTable className="min-w-[700px]">
            <thead>
              <tr className="border-b border-white/5 bg-[#141433]/60">
                <th scope="col" className={adminThClassName}>#</th>
                <th scope="col" className={adminThClassName}>Acheteur</th>
                <th scope="col" className={adminThClassName}>Article</th>
                <th scope="col" className={adminThClassName}>Prix</th>
                <th scope="col" className={adminThClassName}>Statut</th>
                <th scope="col" className={adminThClassName}>Date</th>
                <th scope="col" className={`${adminThClassName} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={`${adminTrClassName} ${order.status === "pendente" ? "bg-admin-brand-yellow/[0.03]" : ""}`}>
                  <td className={`${adminTdClassName} text-[12px] text-admin-text-tertiary`}>#{order.id}</td>
                  <td className={`${adminTdClassName} text-[13px] font-semibold text-white`}>{order.user_nick || `#${order.user_id}`}</td>
                  <td className={adminTdClassName}>
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
                  <td className={`${adminTdClassName} text-[13px] font-bold text-admin-brand-yellow`}>{order.preco}</td>
                  <td className={adminTdClassName}>
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className={`${adminTdClassName} text-[12px] text-admin-text-tertiary`}>{"—"}</td>
                  <td className={adminTdClassName}>
                    <div className="flex items-center justify-end gap-1">
                      {order.status === "pendente" && (
                        <>
                          <AdminButton
                            tone="success"
                            size="sm"
                            icon={<Truck className="h-3 w-3" />}
                            disabled={updatingId === order.id}
                            onClick={() => void handleUpdateStatus(order.id, "entregue")}
                          >
                            Livré
                          </AdminButton>
                          <AdminButton
                            tone="danger"
                            size="sm"
                            icon={<X className="h-3 w-3" />}
                            disabled={updatingId === order.id}
                            onClick={() => void handleUpdateStatus(order.id, "cancelado")}
                          >
                            Annuler
                          </AdminButton>
                        </>
                      )}
                      {order.status === "entregue" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-admin-brand-green/80">
                          <Check className="h-3 w-3" /> Livré
                        </span>
                      )}
                      {order.status === "cancelado" && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-admin-brand-red/80">
                          <X className="h-3 w-3" /> Annulé
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        </AdminTableShell>
      )}

      {orders.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[12px] text-admin-text-tertiary">{total} commande{total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-1">
            <AdminButton size="sm" tone="ghost" disabled={page <= 1 || loading} onClick={() => fetchOrders(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </AdminButton>
            <span className="px-2 text-[12px] text-admin-text-tertiary">{page}/{pageCount}</span>
            <AdminButton size="sm" tone="ghost" disabled={page >= pageCount || loading} onClick={() => fetchOrders(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </AdminButton>
          </div>
        </div>
      )}
    </>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    pendente: { label: "En attente", cls: "bg-admin-brand-yellow/15 text-admin-brand-yellow" },
    entregue: { label: "Livré", cls: "bg-admin-brand-green/15 text-admin-brand-green" },
    cancelado: { label: "Annulé", cls: "bg-admin-brand-red-strong/15 text-admin-brand-red" },
  };
  const c = config[status] ?? { label: status, cls: "bg-white/5 text-admin-text-tertiary" };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${c.cls}`}>
      {c.label}
    </span>
  );
}
