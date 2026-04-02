"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, ExternalLink, Save, X } from "lucide-react";

type PubItem = {
  id: number;
  nome: string;
  link: string;
  imagem: string;
  status: string;
};

type EditState = {
  id: number | null; // null = creating new
  nome: string;
  link: string;
  imagem: string;
  status: string;
};

export default function AdminPubPanel() {
  const [items, setItems] = useState<PubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pub");
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
    setEdit({ id: null, nome: "", link: "", imagem: "", status: "ativo" });
  };

  const startEdit = (item: PubItem) => {
    setEdit({ id: item.id, nome: item.nome, link: item.link, imagem: item.imagem, status: item.status });
  };

  const cancelEdit = () => setEdit(null);

  const handleSave = async () => {
    if (!edit) return;
    if (!edit.nome.trim() || !edit.link.trim() || !edit.imagem.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }
    setSaving(true);
    try {
      const action = edit.id ? "update" : "create";
      const body: any = {
        action,
        nome: edit.nome.trim(),
        link: edit.link.trim(),
        imagem: edit.imagem.trim(),
        status: edit.status,
      };
      if (edit.id) body.id = edit.id;

      const res = await fetch("/api/admin/pub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Erreur");
      toast.success(edit.id ? "Publicite mise a jour" : "Publicite creee");
      setEdit(null);
      fetchItems();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cette publicite ?")) return;
    try {
      const res = await fetch("/api/admin/pub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id }),
      });
      if (!res.ok) throw new Error("Echec suppression");
      toast.success("Publicite supprimee");
      fetchItems();
    } catch {
      toast.error("Erreur suppression");
    }
  };

  const handleToggleStatus = async (item: PubItem) => {
    const newStatus = item.status === "ativo" ? "inativo" : "ativo";
    try {
      const res = await fetch("/api/admin/pub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update", id: item.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Echec");
      toast.success(newStatus === "ativo" ? "Activee" : "Desactivee");
      fetchItems();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[16px] font-bold text-white">Gestion des publicites</h3>
          <p className="text-[12px] text-[#BEBECE]/70">
            Les publicites s&apos;affichent sur la page d&apos;accueil.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#2596FF] px-3 py-2 text-[12px] font-bold text-white hover:bg-[#2976E8]"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {/* Edit/Create form */}
      {edit && (
        <div className="rounded-[4px] border border-[#2596FF]/30 bg-[#25254D] p-4 space-y-3">
          <h4 className="text-[13px] font-bold text-white">
            {edit.id ? "Modifier la publicite" : "Nouvelle publicite"}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/70">Nom</label>
              <input
                type="text"
                value={edit.nome}
                onChange={(e) => setEdit({ ...edit, nome: e.target.value })}
                placeholder="Nom du partenaire"
                className="w-full rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2 text-[13px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/70">Lien (URL)</label>
              <input
                type="url"
                value={edit.link}
                onChange={(e) => setEdit({ ...edit, link: e.target.value })}
                placeholder="https://..."
                className="w-full rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2 text-[13px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-[#BEBECE]/70">
              Image (chemin ou URL)
            </label>
            <input
              type="text"
              value={edit.imagem}
              onChange={(e) => setEdit({ ...edit, imagem: e.target.value })}
              placeholder="/uploads/image.png ou https://..."
              className="w-full rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2 text-[13px] text-white placeholder:text-[#BEBECE]/40 focus:border-[#2596FF] focus:outline-none"
            />
          </div>
          {edit.imagem && (
            <div className="rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-2">
              <p className="mb-1 text-[10px] uppercase text-[#BEBECE]/50">Apercu</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={edit.imagem}
                alt="Apercu"
                className="max-h-[150px] rounded-[3px] object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-[4px] bg-[#2596FF] px-4 py-2 text-[12px] font-bold text-white hover:bg-[#2976E8] disabled:opacity-60"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1.5 rounded-[4px] bg-[rgba(255,255,255,0.08)] px-4 py-2 text-[12px] font-bold text-[#BEBECE] hover:bg-[rgba(255,255,255,0.14)]"
            >
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-[13px] text-[#BEBECE]/50">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-[#BEBECE]/50">
          Aucune publicite configuree.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-[4px] border p-3 transition ${
                item.status === "ativo"
                  ? "border-[#141433] bg-[#25254D]"
                  : "border-[#141433] bg-[#1F1F3E] opacity-50"
              }`}
            >
              {/* Thumbnail */}
              <div className="h-[50px] w-[80px] shrink-0 overflow-hidden rounded-[3px] bg-[#141433]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imagem}
                  alt={item.nome}
                  className="h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-bold text-white">{item.nome}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    item.status === "ativo" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                  }`}>
                    {item.status === "ativo" ? "Actif" : "Inactif"}
                  </span>
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-[#2596FF] hover:underline"
                >
                  {item.link.length > 50 ? `${item.link.slice(0, 50)}...` : item.link}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(item)}
                  className="rounded-[3px] px-2 py-1.5 text-[11px] font-bold text-[#BEBECE] hover:bg-[rgba(255,255,255,0.08)]"
                  title={item.status === "ativo" ? "Desactiver" : "Activer"}
                >
                  {item.status === "ativo" ? "Desactiver" : "Activer"}
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-[3px] p-1.5 text-[#BEBECE] hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                  title="Modifier"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="rounded-[3px] p-1.5 text-[#BEBECE] hover:bg-red-500/20 hover:text-red-400"
                  title="Supprimer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
