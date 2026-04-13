"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ImagePlus,
  Package,
  Pencil,
  Plus,
  Save,
  ShoppingBag,
  Trash2,
  Truck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import type { ShopItem, ShopOrder } from "@/types/shop";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type EditState = {
  id: number | null;
  nome: string;
  descricao: string;
  imagem: string;
  preco: number;
  estoque: number;
  status: string;
};

/* ------------------------------------------------------------------ */
/*  Image Upload Component                                             */
/* ------------------------------------------------------------------ */

function ImageUpload({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 Mo)");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur d'upload");

      onChange(json.url);
      toast.success("Image uploadée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/60">
        Image
      </label>

      {/* Preview + remove */}
      {value ? (
        <div className="relative inline-block rounded-[8px] border border-white/10 bg-[#1A1A3A] p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Aperçu"
            className="max-h-[120px] max-w-[200px] rounded-[4px] object-contain image-pixelated"
            onError={(e) => {
              (e.target as HTMLImageElement).src = "/img/box.png";
            }}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#F92330] text-white shadow-lg transition-transform hover:scale-110"
            title="Supprimer l'image"
            aria-label="Supprimer l'image"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="mt-2 max-w-[200px] truncate text-[10px] text-[#BEBECE]/40">
            {value}
          </p>
        </div>
      ) : (
        /* Drop zone */
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Cliquer ou glisser-déposer une image"
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed px-6 py-8 transition-colors ${
            dragOver
              ? "border-[#2596FF] bg-[#2596FF]/5"
              : "border-white/10 bg-[#1A1A3A] hover:border-[#2596FF]/40 hover:bg-[#2596FF]/[0.03]"
          } ${uploading ? "pointer-events-none opacity-60" : ""}`}
        >
          {uploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#2596FF]/30 border-t-[#2596FF]" />
              <span className="text-[12px] font-medium text-[#BEBECE]/60">
                Upload en cours...
              </span>
            </>
          ) : (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#2596FF]/10 text-[#2596FF]">
                <ImagePlus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white">
                  Cliquer ou glisser-déposer
                </p>
                <p className="mt-0.5 text-[11px] text-[#BEBECE]/50">
                  PNG, JPG, GIF, WebP — Max 5 Mo
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
        aria-hidden="true"
      />

      {/* Fallback: paste URL */}
      {!value && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#BEBECE]/40">ou</span>
          <button
            type="button"
            onClick={() => {
              const url = window.prompt("Coller une URL d'image :");
              if (url?.trim()) onChange(url.trim());
            }}
            className="text-[11px] font-medium text-[#2596FF]/70 transition-colors hover:text-[#2596FF]"
          >
            Coller une URL
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminShopPanel() {
  const [tab, setTab] = useState<"items" | "orders">("items");

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-[6px] bg-[#141433]/50 p-1">
        <button
          type="button"
          onClick={() => setTab("items")}
          className={`flex items-center gap-2 rounded-[4px] px-4 py-2 text-[13px] font-semibold transition-colors ${
            tab === "items" ? "bg-[#2596FF] text-white" : "text-[#BEBECE]/60 hover:text-white"
          }`}
        >
          <Package className="h-4 w-4" />
          Articles
        </button>
        <button
          type="button"
          onClick={() => setTab("orders")}
          className={`flex items-center gap-2 rounded-[4px] px-4 py-2 text-[13px] font-semibold transition-colors ${
            tab === "orders" ? "bg-[#2596FF] text-white" : "text-[#BEBECE]/60 hover:text-white"
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          Commandes
        </button>
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
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shop?view=items", { cache: "no-store" });
      const json = await res.json();
      setItems(json?.data ?? []);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-bold text-white">Articles de la boutique</h3>
          <p className="text-[12px] text-[#BEBECE]/50">{items.length} article{items.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#2596FF] px-3.5 py-2 text-[12px] font-bold text-white hover:bg-[#2976E8]"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter un article
        </button>
      </div>

      {/* Edit/Create form */}
      {edit && (
        <div className="rounded-[8px] border border-[#2596FF]/20 bg-[#141433]/50 p-5 space-y-4">
          <h4 className="text-[14px] font-bold text-white">
            {edit.id ? "Modifier l'article" : "Nouvel article"}
          </h4>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
            {/* Left: fields */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/60">Nom</label>
                  <input
                    type="text"
                    value={edit.nome}
                    onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                    placeholder="Nom du mobi"
                    className="w-full rounded-[6px] border border-white/10 bg-[#1A1A3A] px-3 py-2.5 text-[13px] text-white placeholder:text-[#BEBECE]/30 focus:border-[#2596FF]/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/60">Prix (coins)</label>
                  <input
                    type="number"
                    min={0}
                    value={edit.preco}
                    onChange={(e) => setEdit({ ...edit, preco: Number(e.target.value) || 0 })}
                    className="w-full rounded-[6px] border border-white/10 bg-[#1A1A3A] px-3 py-2.5 text-[13px] text-white focus:border-[#2596FF]/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/60">Stock</label>
                  <input
                    type="number"
                    min={0}
                    value={edit.estoque}
                    onChange={(e) => setEdit({ ...edit, estoque: Number(e.target.value) || 0 })}
                    className="w-full rounded-[6px] border border-white/10 bg-[#1A1A3A] px-3 py-2.5 text-[13px] text-white focus:border-[#2596FF]/40 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/60">Description (optionnel)</label>
                <textarea
                  value={edit.descricao}
                  onChange={(e) => setEdit({ ...edit, descricao: e.target.value })}
                  placeholder="Description du mobi..."
                  rows={2}
                  className="w-full rounded-[6px] border border-white/10 bg-[#1A1A3A] px-3 py-2.5 text-[13px] text-white placeholder:text-[#BEBECE]/30 focus:border-[#2596FF]/40 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Right: image upload */}
            <ImageUpload
              value={edit.imagem}
              onChange={(url) => setEdit({ ...edit, imagem: url })}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#2596FF] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#2976E8] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={() => setEdit(null)}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-white/5 px-4 py-2 text-[12px] font-bold text-[#BEBECE] hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      {loading ? (
        <div className="py-8 text-center text-[13px] text-[#BEBECE]/50">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-white/10 bg-[#141433]/30 p-12 text-center">
          <Package className="h-8 w-8 text-[#BEBECE]/20" />
          <p className="text-[13px] text-[#BEBECE]/50">Aucun article dans la boutique</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-white/5">
          <table className="w-full min-w-[600px] text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[#141433]/60">
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Article</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Prix</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Stock</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Statut</th>
                <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-[40px] w-[40px] shrink-0 overflow-hidden rounded-[4px] bg-[#303060]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          className="h-full w-full object-contain image-pixelated"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/img/box.png"; }}
                        />
                      </div>
                      <span className="text-[13px] font-semibold text-white">{item.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-bold text-[#FFC800]">{item.preco} coins</td>
                  <td className="px-4 py-3 text-[13px] text-[#BEBECE]/70">{item.estoque}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold uppercase ${item.status === "ativo" ? "text-[#0FD52F]" : "text-[#F92330]"}`}>
                      {item.status === "ativo" ? "Actif" : "Inactif"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" onClick={() => startEdit(item)} className="grid h-[36px] w-[36px] place-items-center rounded-[6px] text-[#BEBECE]/60 hover:bg-[#2596FF]/10 hover:text-[#2596FF]" title="Modifier">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={() => handleToggleStatus(item)} className="grid h-[36px] w-[36px] place-items-center rounded-[6px] text-[#BEBECE]/60 hover:bg-[#FFC800]/10 hover:text-[#FFC800]" title={item.status === "ativo" ? "Désactiver" : "Activer"}>
                        {item.status === "ativo" ? <XCircle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </button>
                      <button type="button" onClick={() => setDeleteConfirmId(item.id)} className="grid h-[36px] w-[36px] place-items-center rounded-[6px] text-[#BEBECE]/60 hover:bg-[#F92330]/10 hover:text-[#F92330]" title="Supprimer">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  const [orders, setOrders] = useState<ShopOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const pageCount = Math.max(1, Math.ceil(total / 20));

  const fetchOrders = useCallback(async (p = 1, status = statusFilter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view: "orders", page: String(p) });
      if (status) params.set("status", status);
      const res = await fetch(`/api/admin/shop?${params}`, { cache: "no-store" });
      const json = await res.json();
      setOrders(json?.data ?? []);
      setTotal(json?.total ?? 0);
      setPage(p);
    } catch {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchOrders(1); }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_order", id: orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Échec");
      toast.success(
        newStatus === "entregue" ? "Commande marquée comme livrée" :
        newStatus === "cancelado" ? "Commande annulée" : "Statut mis à jour"
      );
      fetchOrders(page);
    } catch {
      toast.error("Erreur");
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
                statusFilter === s ? "bg-[#2596FF] text-white" : "bg-white/5 text-[#BEBECE]/60 hover:text-white"
              }`}
            >
              {s === "" ? "Toutes" : s === "pendente" ? "En attente" : s === "entregue" ? "Livrées" : "Annulées"}
            </button>
          ))}
        </div>
      </div>

      {/* Orders table */}
      {loading ? (
        <div className="py-8 text-center text-[13px] text-[#BEBECE]/50">Chargement...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[8px] border border-dashed border-white/10 bg-[#141433]/30 p-12 text-center">
          <ShoppingBag className="h-8 w-8 text-[#BEBECE]/20" />
          <p className="text-[13px] text-[#BEBECE]/50">Aucune commande</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[8px] border border-white/5">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="border-b border-white/5 bg-[#141433]/60">
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">#</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Acheteur</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Article</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Prix</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Statut</th>
                <th scope="col" className="px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Date</th>
                <th scope="col" className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] ${order.status === "pendente" ? "bg-[#FFC800]/[0.03]" : ""}`}>
                  <td className="px-4 py-3 text-[12px] text-[#BEBECE]/50">#{order.id}</td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-white">{order.user_nick || `#${order.user_id}`}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {order.item_imagem && (
                        <div className="h-[28px] w-[28px] shrink-0 overflow-hidden rounded-[3px] bg-[#303060]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={order.item_imagem} alt="" className="h-full w-full object-contain image-pixelated" />
                        </div>
                      )}
                      <span className="text-[13px] text-[#BEBECE]/70">{order.item_nome || `Item #${order.item_id}`}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-bold text-[#FFC800]">{order.preco}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#BEBECE]/50">
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
          <span className="text-[12px] text-[#BEBECE]/50">{total} commande{total !== 1 ? "s" : ""}</span>
          <div className="flex items-center gap-1">
            <button type="button" disabled={page <= 1 || loading} onClick={() => fetchOrders(page - 1)} className="grid h-[32px] w-[32px] place-items-center rounded-[4px] text-[#BEBECE]/60 hover:bg-white/5 hover:text-white disabled:opacity-30">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-[12px] text-[#BEBECE]/60">{page}/{pageCount}</span>
            <button type="button" disabled={page >= pageCount || loading} onClick={() => fetchOrders(page + 1)} className="grid h-[32px] w-[32px] place-items-center rounded-[4px] text-[#BEBECE]/60 hover:bg-white/5 hover:text-white disabled:opacity-30">
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
