"use client";

import { useState } from "react";
import { ExternalLink, Eye, EyeOff, Pencil, Plus, Save, Trash2, X } from "lucide-react";
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
} from "@/components/admin/ui";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import { mediaUrl } from "@/lib/media-url";

type PubItem = {
  id: string;
  nome: string;
  link: string;
  imagem: string;
  status: string;
};

type EditState = {
  id: string | null;
  nome: string;
  link: string;
  imagem: string;
  status: string;
};

type PubMutationBody = {
  action: "create" | "update" | "delete";
  id?: string;
  nome?: string;
  link?: string;
  imagem?: string;
  status?: string;
};

export default function AdminPubPanel() {
  const {
    data: items,
    loading,
    refetch: fetchItems,
  } = useAdminFetch<PubItem[]>("/api/admin/pub", {
    select: (raw) => {
      const payload = raw as { data?: PubItem[] } | null;
      return payload?.data ?? [];
    },
    onError: () => toast.error("Erreur de chargement"),
  });
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const startCreate = () => {
    setEdit({ id: null, nome: "", link: "", imagem: "", status: "ativo" });
  };

  const startEdit = (item: PubItem) => {
    setEdit({ id: item.id, nome: item.nome, link: item.link, imagem: item.imagem, status: item.status });
  };

  const mutatePub = async (body: PubMutationBody) => {
    const res = await fetch("/api/admin/pub", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error(json?.error || "Erreur");
    return json;
  };

  const handleSave = async () => {
    if (!edit) return;
    if (!edit.nome.trim() || !edit.link.trim() || !edit.imagem.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }
    setSaving(true);
    try {
      const action = edit.id ? "update" : "create";
      await mutatePub({
        action,
        id: edit.id ?? undefined,
        nome: edit.nome.trim(),
        link: edit.link.trim(),
        imagem: edit.imagem.trim(),
        status: edit.status,
      });
      toast.success(edit.id ? "Publicité mise à jour" : "Publicité créée");
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
      await mutatePub({ action: "delete", id: deleteConfirmId });
      toast.success("Publicité supprimée");
      await fetchItems();
    } catch {
      toast.error("Erreur suppression");
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = async (item: PubItem) => {
    const nextStatus = item.status === "ativo" ? "inativo" : "ativo";
    try {
      await mutatePub({ action: "update", id: item.id, status: nextStatus });
      toast.success(nextStatus === "ativo" ? "Activée" : "Désactivée");
      await fetchItems();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-5">
      <AdminPanelHeader
        title="Gestion des publicités"
        description="Les publicités s'affichent sur la page d'accueil."
        actions={
          <AdminButton tone="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={startCreate}>
            Ajouter
          </AdminButton>
        }
      />

      {edit && (
        <AdminPanel tone="accent" className="space-y-4">
          <h4 className="text-[14px] font-bold text-white">
            {edit.id ? "Modifier la publicité" : "Nouvelle publicité"}
          </h4>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <AdminField label="Nom">
              <AdminInput
                value={edit.nome}
                onChange={(event) => setEdit({ ...edit, nome: event.target.value })}
                placeholder="Nom du partenaire"
              />
            </AdminField>
            <AdminField label="Lien">
              <AdminInput
                value={edit.link}
                onChange={(event) => setEdit({ ...edit, link: event.target.value })}
                placeholder="https://... ou discord.gg/xxxx"
              />
            </AdminField>
          </div>

          <AdminImageUpload
            value={edit.imagem}
            onChange={(imagem) => setEdit({ ...edit, imagem })}
            endpoint="/api/upload/image"
            hint="PNG, JPEG, WebP ou GIF - max 5 Mo. L'image est stockée sur PocketBase."
            resolvePreview={(value) => mediaUrl(value) || value}
            onPreviewError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <AdminButton
              tone="primary"
              icon={<Save className="h-3.5 w-3.5" />}
              disabled={saving}
              onClick={handleSave}
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
      ) : !items || items.length === 0 ? (
        <AdminEmptyState title="Aucune publicité configurée" description="Ajoute un partenaire pour l'afficher sur l'accueil." />
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const active = item.status === "ativo";
            return (
              <article
                key={item.id}
                className={`flex items-center gap-3 rounded-[8px] border border-[#141433] p-3 transition-colors ${
                  active ? "bg-admin-bg-600" : "bg-admin-bg-700 opacity-60"
                }`}
              >
                <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-[4px] bg-admin-bg-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mediaUrl(item.imagem) || item.imagem}
                    alt={item.nome}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-bold text-white">{item.nome}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        active ? "bg-admin-brand-green/20 text-admin-brand-green" : "bg-admin-brand-red-strong/20 text-admin-brand-red"
                      }`}
                    >
                      {active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex max-w-full items-center gap-1 text-[11px] text-admin-brand-blue hover:underline"
                  >
                    <span className="truncate">{item.link}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <AdminIconButton
                    label={active ? "Désactiver" : "Activer"}
                    tone={active ? "yellow" : "green"}
                    onClick={() => void handleToggleStatus(item)}
                  >
                    {active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </AdminIconButton>
                  <AdminIconButton label="Modifier" tone="blue" onClick={() => startEdit(item)}>
                    <Pencil className="h-4 w-4" />
                  </AdminIconButton>
                  <AdminIconButton label="Supprimer" tone="red" onClick={() => setDeleteConfirmId(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </AdminIconButton>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirmId !== null}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title="Supprimer cette publicité ?"
        description="La publicité sera supprimée définitivement de la page d'accueil."
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteLoading}
        icon={<Trash2 className="h-5 w-5" />}
      />
    </div>
  );
}
