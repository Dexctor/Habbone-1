"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  Crown,
  Hammer,
  Megaphone,
  Palette,
  Pencil,
  PenSquare,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  User,
  Users,
  Wrench,
} from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";
import ConfirmDialog from "@/components/admin/ConfirmDialog";

type Role = {
  id: string;
  name: string;
  description?: string | null;
  admin_access?: boolean;
  app_access?: boolean;
};

type RoleCounts = Record<string, number>;

type EditingRole = {
  id: string | null; // null = creating new
  name: string;
  description: string;
  adminAccess: boolean;
};

/* ------------------------------------------------------------------ */
/*  Icon mapping based on role name                                    */
/* ------------------------------------------------------------------ */

function iconFor(name: string): ReactNode {
  const n = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (n.includes('fondateur') || n.includes('founder')) return <Crown className="h-5 w-5" />;
  if (n.includes('admin')) return <Shield className="h-5 w-5" />;
  if (n.includes('moderateur') || n.includes('moderator') || n.includes('modo')) return <Hammer className="h-5 w-5" />;
  if (n.includes('animateur') || n.includes('animator')) return <Megaphone className="h-5 w-5" />;
  if (n.includes('graphiste') || n.includes('designer')) return <Palette className="h-5 w-5" />;
  if (n.includes('constructeur') || n.includes('builder') || n.includes('wired')) return <Wrench className="h-5 w-5" />;
  if (n.includes('journaliste') || n.includes('correcteur') || n.includes('writer')) return <PenSquare className="h-5 w-5" />;
  if (n.includes('responsable')) return <Sparkles className="h-5 w-5" />;
  return <User className="h-5 w-5" />;
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function AdminRolesPanel() {
  const { data: roles, loading, refetch: refetchRoles } = useAdminFetch<Role[]>(
    '/api/admin/roles/list',
    {
      select: (raw) => {
        const payload = raw as { data?: Role[] } | null;
        return Array.isArray(payload?.data) ? payload!.data! : [];
      },
    },
  );

  const { data: countsResp, refetch: refetchCounts } = useAdminFetch<RoleCounts>(
    '/api/admin/roles/counts',
    {
      select: (raw) => {
        const payload = raw as { counts?: RoleCounts } | null;
        return payload?.counts ?? {};
      },
    },
  );
  const counts = countsResp ?? {};

  const [editing, setEditing] = useState<EditingRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const roleList = roles ?? [];
  const adminCount = useMemo(() => roleList.filter((r) => r.admin_access).length, [roleList]);
  const hasAdminRoles = adminCount > 0;
  const totalMembers = useMemo(
    () => Object.values(counts).reduce((acc, n) => acc + (n || 0), 0),
    [counts],
  );

  const openCreate = () => {
    setEditing({ id: null, name: '', description: '', adminAccess: false });
  };

  const openEdit = (role: Role) => {
    setEditing({
      id: role.id,
      name: role.name,
      description: role.description ?? '',
      adminAccess: !!role.admin_access,
    });
  };

  const closeEditor = () => {
    if (!saving) setEditing(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    const name = editing.name.trim();
    if (!name) {
      toast.error('Le nom est obligatoire');
      return;
    }

    setSaving(true);
    try {
      const isCreate = editing.id === null;
      const url = isCreate ? '/api/admin/roles/create' : '/api/admin/roles/update';
      const payload = isCreate
        ? {
            name,
            description: editing.description.trim() || undefined,
            adminAccess: editing.adminAccess,
            appAccess: true, // toujours true, le front n'expose pas ce flag
          }
        : {
            roleId: editing.id,
            name,
            description: editing.description.trim() || null,
            adminAccess: editing.adminAccess,
            appAccess: true,
          };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((json as { error?: string })?.error || `HTTP ${res.status}`);
      }

      toast.success(isCreate ? 'Rôle créé' : 'Rôle mis à jour');
      setEditing(null);
      await Promise.all([refetchRoles(), refetchCounts()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast.error(`Erreur : ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/admin/roles/seed', { method: 'POST', cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error('Impossible d\'importer les rôles par défaut');
        return;
      }
      const created = (json?.data?.created || []).length;
      toast.success(created ? `${created} rôle(s) importé(s)` : 'Rôles par défaut déjà présents');
      await Promise.all([refetchRoles(), refetchCounts()]);
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setSeeding(false);
    }
  };

  const requestDelete = (roleId: string) => {
    setDeleteConfirmId(roleId);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/admin/roles/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ roleId: deleteConfirmId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((json as { error?: string })?.error || `HTTP ${res.status}`);
      }
      toast.success('Rôle supprimé');
      setDeleteConfirmId(null);
      // Close the editor if it was open on the deleted role
      if (editing?.id === deleteConfirmId) setEditing(null);
      await Promise.all([refetchRoles(), refetchCounts()]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast.error(`Suppression impossible : ${msg}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteTarget = deleteConfirmId ? roleList.find((r) => r.id === deleteConfirmId) : null;
  const deleteTargetMembers = deleteConfirmId ? counts[deleteConfirmId] ?? 0 : 0;

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-admin-text-tertiary">
          {loading
            ? 'Chargement…'
            : `${roleList.length} rôle${roleList.length > 1 ? 's' : ''} · ${adminCount} donne${adminCount > 1 ? 'nt' : ''} accès à l'admin · ${totalMembers} membre${totalMembers > 1 ? 's' : ''} au total`}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSeedDefaults}
            disabled={loading || seeding}
            className="h-[36px] rounded-[6px] border-[#141433] bg-[#25254D] text-[13px] font-semibold text-white hover:bg-[#303060]"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            {seeding ? 'Import…' : 'Rôles par défaut'}
          </Button>
          <Button
            onClick={openCreate}
            className="h-[36px] rounded-[6px] bg-admin-brand-blue text-[13px] font-semibold text-white hover:bg-admin-brand-blue-hover"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Créer un rôle
          </Button>
        </div>
      </div>

      {/* Warning if no admin role */}
      {!hasAdminRoles && !loading && (
        <div className="mt-5 flex items-start gap-3 rounded-[6px] border border-[#FFC800]/30 bg-[#FFC800]/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#FFC800]" />
          <div className="text-[13px] text-[#FFC800]">
            <p className="font-bold">Aucun rôle administrateur</p>
            <p className="mt-0.5 text-[#FFC800]/80">
              Active l'accès admin sur au moins un rôle pour pouvoir te reconnecter au panel.
            </p>
          </div>
        </div>
      )}

      {/* Roles list */}
      <div className="mt-5 space-y-2">
        {loading && roleList.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed border-[#141433] p-10 text-center">
            <p className="text-[13px] text-admin-text-tertiary">Chargement des rôles…</p>
          </div>
        )}

        {!loading && roleList.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[8px] border border-dashed border-[#141433] p-10 text-center">
            <Shield className="h-8 w-8 text-admin-text-tertiary" />
            <div>
              <p className="text-[14px] font-semibold text-white">Aucun rôle configuré</p>
              <p className="mt-1 text-[12px] text-admin-text-tertiary">
                Crée ton premier rôle ou importe les rôles par défaut.
              </p>
            </div>
          </div>
        )}

        {roleList.map((role) => {
          const memberCount = counts[role.id] ?? 0;
          return (
            <article
              key={role.id}
              className="flex items-center gap-4 rounded-[8px] border border-[#141433] bg-[#1F1F3E] px-4 py-3.5 transition-colors hover:bg-[#25254D]"
            >
              {/* Icon */}
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-[8px] ${
                  role.admin_access
                    ? 'bg-admin-brand-blue/15 text-admin-brand-blue'
                    : 'bg-[#303060] text-admin-text-tertiary'
                }`}
              >
                {iconFor(role.name)}
              </div>

              {/* Name + description */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[14px] font-bold text-white">
                    {role.name || 'Sans nom'}
                  </h3>
                  {role.admin_access && (
                    <Badge className="border-0 bg-admin-brand-blue/15 text-[10px] font-bold uppercase text-admin-brand-blue">
                      Accès admin
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 truncate text-[12px] text-admin-text-tertiary">
                  {role.description || 'Pas de description'}
                </p>
              </div>

              {/* Members count */}
              <div className="hidden shrink-0 items-center gap-1.5 text-[12px] text-admin-text-tertiary sm:flex">
                <Users className="h-3.5 w-3.5" />
                <span className="font-semibold text-white">{memberCount}</span>
                <span>membre{memberCount > 1 ? 's' : ''}</span>
              </div>

              {/* Edit button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => openEdit(role)}
                className="h-8 shrink-0 rounded-[6px] border-[#141433] bg-[#25254D] text-[12px] font-semibold text-white hover:bg-[#303060]"
              >
                <Pencil className="mr-1 h-3 w-3" />
                Éditer
              </Button>
            </article>
          );
        })}
      </div>

      {/* Edit / Create dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEditor()}>
        <DialogContent className="max-w-lg rounded-[8px] border border-[#141433] bg-[#1F1F3E] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editing?.id === null ? 'Créer un rôle' : 'Éditer le rôle'}
            </DialogTitle>
            <DialogDescription className="text-admin-text-tertiary">
              {editing?.id === null
                ? 'Donne un nom à ce rôle et choisis s\'il a accès au panel admin.'
                : 'Modifie les infos de ce rôle. Les changements s\'appliquent immédiatement.'}
            </DialogDescription>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="role-name" className="text-[11px] font-bold uppercase tracking-[0.08em] text-admin-text-tertiary">
                  Nom <span className="text-[#F92330]">*</span>
                </Label>
                <Input
                  id="role-name"
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, name: e.target.value } : prev))
                  }
                  placeholder="Ex. Animateur"
                  className="h-[40px] rounded-[6px] border-[#141433] bg-[#25254D] text-white"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role-desc" className="text-[11px] font-bold uppercase tracking-[0.08em] text-admin-text-tertiary">
                  Description
                </Label>
                <Textarea
                  id="role-desc"
                  value={editing.description}
                  onChange={(e) =>
                    setEditing((prev) => (prev ? { ...prev, description: e.target.value } : prev))
                  }
                  placeholder="À quoi sert ce rôle ? (optionnel)"
                  rows={2}
                  className="rounded-[6px] border-[#141433] bg-[#25254D] text-white"
                />
              </div>

              <div className="flex items-start gap-3 rounded-[6px] border border-[#141433] bg-[#25254D] p-3.5">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-admin-brand-blue" />
                <div className="flex-1">
                  <Label htmlFor="role-admin" className="block text-[13px] font-semibold text-white">
                    Accès au panel admin
                  </Label>
                  <p className="mt-0.5 text-[12px] text-admin-text-tertiary">
                    Les membres de ce rôle pourront accéder à /admin.
                  </p>
                </div>
                <Switch
                  id="role-admin"
                  checked={editing.adminAccess}
                  onCheckedChange={(v) =>
                    setEditing((prev) => (prev ? { ...prev, adminAccess: !!v } : prev))
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {editing?.id && (
              <Button
                variant="outline"
                onClick={() => editing.id && requestDelete(editing.id)}
                disabled={saving}
                className="h-[36px] rounded-[6px] border-[#F92330]/30 bg-[#F92330]/10 text-[13px] font-semibold text-[#F92330] hover:bg-[#F92330]/20"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Supprimer
              </Button>
            )}
            <div className="flex gap-2 sm:ml-auto">
              <Button
                variant="outline"
                onClick={closeEditor}
                disabled={saving}
                className="h-[36px] rounded-[6px] border-[#141433] bg-[#25254D] text-[13px] text-white hover:bg-[#303060]"
              >
                Annuler
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !editing?.name.trim()}
                className="h-[36px] rounded-[6px] bg-admin-brand-blue text-[13px] font-semibold text-white hover:bg-admin-brand-blue-hover disabled:opacity-50"
              >
                {saving
                  ? 'Sauvegarde…'
                  : editing?.id === null
                    ? 'Créer'
                    : 'Enregistrer'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title={deleteTarget ? `Supprimer « ${deleteTarget.name} » ?` : 'Supprimer ce rôle ?'}
        description={
          deleteTargetMembers > 0
            ? `Impossible : ${deleteTargetMembers} utilisateur(s) ont encore ce rôle. Réaffecte-les d'abord dans l'onglet Utilisateurs.`
            : 'Cette action est irréversible. Personne n\'utilise actuellement ce rôle.'
        }
        confirmLabel={deleteTargetMembers > 0 ? 'OK' : 'Supprimer'}
        variant="danger"
        loading={deleteLoading}
        icon={<Trash2 className="h-5 w-5" />}
      />
    </>
  );
}
