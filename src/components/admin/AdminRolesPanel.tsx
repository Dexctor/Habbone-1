"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { ChevronDown } from "lucide-react";
import { useAdminFetch } from "@/hooks/useAdminFetch";

type Role = {
  id: string;
  name: string;
  description?: string | null;
  admin_access?: boolean;
  app_access?: boolean;
};

type EditableRole = Pick<Role, "id" | "name" | "description">;

export default function AdminRolesPanel() {
  const {
    data: roles,
    loading,
    refetch: fetchRoles,
  } = useAdminFetch<Role[]>('/api/admin/roles/list', {
    select: (raw) => {
      const payload = raw as { data?: Role[] } | null;
      return Array.isArray(payload?.data) ? payload!.data! : [];
    },
  });
  const [creating, setCreating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [editingRole, setEditingRole] = useState<EditableRole | null>(null);
  const [editingLoading, setEditingLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [adminAccess, setAdminAccess] = useState(false);
  const [appAccess, setAppAccess] = useState(true);

  const roleList = roles ?? [];
  const adminCount = useMemo(() => roleList.filter((r) => r.admin_access).length, [roleList]);
  const hasAdminRoles = adminCount > 0;

  const handleCreateRole = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const payload = {
        name: name.trim(),
        description: description || undefined,
        adminAccess,
        appAccess,
      };
      const res = await fetch("/api/admin/roles/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error("Impossible de creer le role");
        return;
      }
      toast.success("Role cree");
      setName("");
      setDescription("");
      setAdminAccess(false);
      setAppAccess(true);
      setShowCreate(false);
      await fetchRoles();
    } catch {
      toast.error("Erreur reseau lors de la creation");
    } finally {
      setCreating(false);
    }
  };

  const handleSeedRoles = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/roles/seed", { method: "POST", cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error("Echec de la creation automatique");
        return;
      }
      const created = (json?.data?.created || []).length;
      toast.success(created ? `${created} role(s) ajoute(s)` : "Roles deja presents");
      await fetchRoles();
    } catch {
      toast.error("Erreur reseau lors de la creation automatique");
    } finally {
      setSeeding(false);
    }
  };

  const updateRole = async (
    roleId: string,
    patch: Partial<{ name: string; description: string | null; admin_access: boolean; app_access: boolean }>
  ) => {
    try {
      const res = await fetch("/api/admin/roles/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          roleId,
          name: patch.name ?? undefined,
          description: patch.description ?? undefined,
          adminAccess: patch.admin_access ?? undefined,
          appAccess: patch.app_access ?? undefined,
        }),
      });
      if (!res.ok) {
        toast.error("Echec de la mise a jour du role");
        return false;
      }
      await fetchRoles();
      return true;
    } catch {
      toast.error("Erreur reseau lors de la mise a jour");
      return false;
    }
  };

  const handleSaveAccess = async (roleId: string, access: { admin: boolean; app: boolean }) => {
    const success = await updateRole(roleId, {
      admin_access: access.admin,
      app_access: access.app,
    });
    if (success) toast.success("Acces mis a jour");
  };

  const openEditDialog = (role: Role) => {
    setEditingRole({
      id: role.id,
      name: role.name,
      description: role.description ?? "",
    });
  };

  const handleSaveEdition = async () => {
    if (!editingRole) return;
    setEditingLoading(true);
    const ok = await updateRole(editingRole.id, {
      name: editingRole.name.trim(),
      description: editingRole.description?.trim() || null,
    });
    setEditingLoading(false);
    if (ok) {
      toast.success("Role mis a jour");
      setEditingRole(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="flex flex-wrap gap-3 text-xs text-[color:var(--foreground)]/55">
        <span>{roleList.length} role(s)</span>
        <span>-</span>
        <span>{adminCount} avec acces admin</span>
      </div>

      {/* Create new role */}
      <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-4">
        <button
          type="button"
          onClick={() => setShowCreate((prev) => !prev)}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <div>
            <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-white">Nouveau role</h2>
            <p className="text-xs text-[color:var(--foreground)]/55">Creer un role et definir ses acces.</p>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-admin-text-tertiary transition-transform ${showCreate ? "rotate-180" : ""}`}
          />
        </button>

        {showCreate && (
          <div className="mt-4 grid gap-3 border-t border-[#141433] pt-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="roleName" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">Nom</Label>
              <Input
                id="roleName"
                placeholder="Ex. Responsable"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roleDescription" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">Description</Label>
              <Input
                id="roleDescription"
                placeholder="Resume des responsabilites"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white"
              />
            </div>
            <div className="grid gap-2 sm:col-span-2">
              <ToggleRow
                label="Acces administrateur"
                helper="Acces complet au back-office."
                value={adminAccess}
                onChange={setAdminAccess}
              />
              <ToggleRow
                label="Acces application"
                helper="Outils applicatifs internes."
                value={appAccess}
                onChange={setAppAccess}
              />
            </div>
            <div className="flex gap-2 sm:col-span-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={handleSeedRoles}
                disabled={loading || seeding}
                className="h-[36px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-xs font-bold uppercase text-white hover:bg-[#303060]"
              >
                {seeding ? "Creation..." : "Roles par defaut"}
              </Button>
              <Button
                onClick={handleCreateRole}
                disabled={creating || !name.trim()}
                className="h-[36px] rounded-[4px] bg-[#2596FF] text-xs font-bold uppercase text-white hover:bg-[#2976E8]"
              >
                {creating ? "..." : "Creer le role"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Existing roles */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-admin-text-tertiary">
          {loading ? "Chargement..." : `${roleList.length} role(s) existant(s)`}
        </p>

        {roleList.map((role) => (
          <RoleCard key={role.id} role={role} onSaveAccess={handleSaveAccess} onEdit={openEditDialog} />
        ))}

        {!roleList.length && !loading && (
          <div className="flex flex-col items-center justify-center gap-2 rounded-[4px] border border-dashed border-[#141433] p-8 text-center">
            <p className="text-sm text-[color:var(--foreground)]/55">Aucun role. Creez-en un ou importez les roles par defaut.</p>
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editingRole} onOpenChange={(open) => !open && setEditingRole(null)}>
        <DialogContent className="max-w-lg rounded-[4px] border border-[#141433] bg-[#1F1F3E] text-[color:var(--foreground)]">
          <DialogHeader>
            <DialogTitle className="text-white">Renommer le role</DialogTitle>
            <DialogDescription className="text-[color:var(--foreground)]/55">
              Modifiez le nom ou la description.
            </DialogDescription>
          </DialogHeader>
          {editingRole && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="editRoleName" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">Nom</Label>
                <Input
                  id="editRoleName"
                  value={editingRole.name}
                  onChange={(e) =>
                    setEditingRole((prev) =>
                      prev ? { ...prev, name: e.target.value } : prev
                    )
                  }
                  className="h-[40px] rounded-[4px] border-[#141433] bg-[#25254D] text-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editRoleDescription" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">Description</Label>
                <Input
                  id="editRoleDescription"
                  value={editingRole.description ?? ""}
                  onChange={(e) =>
                    setEditingRole((prev) =>
                      prev ? { ...prev, description: e.target.value } : prev
                    )
                  }
                  placeholder="Resume des responsabilites"
                  className="h-[40px] rounded-[4px] border-[#141433] bg-[#25254D] text-white"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingRole(null)}
              className="h-[36px] rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSaveEdition}
              disabled={editingLoading || !editingRole?.name.trim()}
              className="h-[36px] rounded-[4px] bg-[#2596FF] text-white hover:bg-[#2976E8]"
            >
              {editingLoading ? "..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!hasAdminRoles && !loading && (
        <div className="rounded-[4px] border border-[#FFC800]/30 bg-[#FFC800]/10 px-4 py-3 text-sm text-[#FFC800]">
          Aucun role administrateur configure. Activez l&apos;acces admin sur au moins un role.
        </div>
      )}
    </div>
  );
}

function RoleCard({
  role,
  onSaveAccess,
  onEdit,
}: {
  role: Role;
  onSaveAccess: (roleId: string, access: { admin: boolean; app: boolean }) => Promise<void>;
  onEdit: (role: Role) => void;
}) {
  const [admin, setAdmin] = useState(!!role.admin_access);
  const [app, setApp] = useState(!!role.app_access);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAdmin(!!role.admin_access);
    setApp(!!role.app_access);
  }, [role.admin_access, role.app_access]);

  const dirty = admin !== !!role.admin_access || app !== !!role.app_access;

  const handleSave = async () => {
    setSaving(true);
    await onSaveAccess(role.id, { admin, app });
    setSaving(false);
  };

  const handleReset = () => {
    setAdmin(!!role.admin_access);
    setApp(!!role.app_access);
  };

  return (
    <article className="rounded-[4px] border border-[#141433] bg-[#25254D] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-bold text-white">{role.name || "Sans nom"}</h3>
          <p className="text-xs text-[color:var(--foreground)]/55">
            {role.description || "Pas de description."}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge className={role.admin_access ? "border-0 bg-[#2596FF]/15 text-admin-brand-blue" : "border-0 bg-[#25254D] text-admin-text-tertiary"}>
            {role.admin_access ? "Admin" : "Pas admin"}
          </Badge>
          <Badge className={role.app_access ? "border-0 bg-green-500/15 text-green-400" : "border-0 bg-[#25254D] text-admin-text-tertiary"}>
            {role.app_access ? "App" : "Pas app"}
          </Badge>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ToggleRow
          label="Acces admin"
          value={admin}
          onChange={setAdmin}
        />
        <ToggleRow
          label="Acces app"
          value={app}
          onChange={setApp}
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-admin-text-tertiary">
        <span>ID: {role.id}</span>
        <div className="flex gap-2">
          {dirty ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={saving}
                className="h-7 rounded-[4px] border-[#141433] bg-[#1F1F3E] text-xs text-white hover:bg-[#303060]"
              >
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-7 rounded-[4px] bg-[#2596FF] text-xs text-white hover:bg-[#2976E8]"
              >
                {saving ? "..." : "Sauver"}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(role)}
              className="h-7 rounded-[4px] border-[#141433] bg-[#1F1F3E] text-xs text-white hover:bg-[#303060]"
            >
              Renommer
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function ToggleRow({
  label,
  helper,
  value,
  onChange,
}: {
  label: string;
  helper?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2.5">
      <div>
        <p className="text-xs font-semibold text-white">{label}</p>
        {helper && <p className="text-[10px] text-admin-text-tertiary">{helper}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
