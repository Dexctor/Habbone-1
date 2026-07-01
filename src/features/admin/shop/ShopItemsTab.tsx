"use client";

import { useState } from "react";
import { Check, Package, Pencil, Plus, Save, Trash2, X, XCircle } from "lucide-react";
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
import { useAdminFetch } from "@/hooks/useAdminFetch";
import type { ShopItem } from "@/types/shop";
import { setShopImageFallback, shopImageSrc } from "./shop-image";

type EditState = {
  id: string | null;
  nome: string;
  descricao: string;
  imagem: string;
  preco: number;
  estoque: number;
  status: string;
};

export function ShopItemsTab() {
  const {
    data,
    loading,
    refetch: fetchItems,
  } = useAdminFetch<ShopItem[]>("/api/admin/shop?view=items", {
    select: (raw) => {
      const payload = raw as { data?: ShopItem[] } | null;
      return payload?.data ?? [];
    },
    onError: () => toast.error("Erreur de chargement"),
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
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erreur");
      toast.success(edit.id ? "Article mis à jour" : "Article créé");
      setEdit(null);
      await fetchItems();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch("/api/admin/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: deleteConfirmId }),
      });
      if (!res.ok) throw new Error("Échec suppression");
      toast.success("Article supprimé");
      await fetchItems();
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
      await fetchItems();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <>
      <AdminPanelHeader
        title="Articles de la boutique"
        description={`${items.length} article${items.length !== 1 ? "s" : ""}`}
        actions={
          <AdminButton tone="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={startCreate}>
            Ajouter un article
          </AdminButton>
        }
      />

      {edit && (
        <AdminPanel tone="accent" className="space-y-4">
          <h4 className="text-[14px] font-bold text-white">
            {edit.id ? "Modifier l'article" : "Nouvel article"}
          </h4>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <AdminField label="Nom">
                  <AdminInput
                    type="text"
                    value={edit.nome}
                    onChange={(event) => setEdit({ ...edit, nome: event.target.value })}
                    placeholder="Nom du mobi"
                  />
                </AdminField>
                <AdminField label="Prix (coins)">
                  <AdminInput
                    type="number"
                    min={0}
                    value={edit.preco}
                    onChange={(event) => setEdit({ ...edit, preco: Number(event.target.value) || 0 })}
                  />
                </AdminField>
                <AdminField label="Stock">
                  <AdminInput
                    type="number"
                    min={0}
                    value={edit.estoque}
                    onChange={(event) => setEdit({ ...edit, estoque: Number(event.target.value) || 0 })}
                  />
                </AdminField>
              </div>
              <AdminField label="Description (optionnel)">
                <AdminTextarea
                  value={edit.descricao}
                  onChange={(event) => setEdit({ ...edit, descricao: event.target.value })}
                  placeholder="Description du mobi..."
                  rows={2}
                />
              </AdminField>
            </div>

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
            <AdminButton tone="ghost" icon={<X className="h-3.5 w-3.5" />} onClick={() => setEdit(null)}>
              Annuler
            </AdminButton>
          </div>
        </AdminPanel>
      )}

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
