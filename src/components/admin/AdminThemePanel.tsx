"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from "@/lib/theme-settings";

type UploadTarget = "logo" | "background";
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export default function AdminThemePanel() {
  const [settings, setSettings] = useState<SiteThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const previewStyle = useMemo<CSSProperties>(
    () => ({
      backgroundColor: settings.headerBackgroundColor,
      backgroundImage: settings.headerBackgroundImageUrl ? `url("${settings.headerBackgroundImageUrl}")` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }),
    [settings.headerBackgroundColor, settings.headerBackgroundImageUrl],
  );
  const colorInputValue = useMemo(
    () =>
      HEX_COLOR_RE.test(settings.headerBackgroundColor)
        ? settings.headerBackgroundColor
        : DEFAULT_THEME_SETTINGS.headerBackgroundColor,
    [settings.headerBackgroundColor],
  );

  async function fetchSettings() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/theme", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(String(json?.error || "Impossible de charger le theme"));
        return;
      }
      setSettings(normalizeThemeSettings(json?.data));
    } catch {
      toast.error("Erreur reseau pendant le chargement");
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings(next: SiteThemeSettings) {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(next),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(String(json?.error || "Impossible d'enregistrer le theme"));
        return;
      }
      const normalized = normalizeThemeSettings(json?.data ?? next);
      setSettings(normalized);
      try {
        window.dispatchEvent(new CustomEvent("theme:updated", { detail: normalized }));
      } catch {}
      toast.success("Theme enregistre");
    } catch {
      toast.error("Erreur reseau pendant la sauvegarde");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpload(target: UploadTarget, file: File | null) {
    if (!file) return;
    setUploading(target);
    try {
      const formData = new FormData();
      formData.set("target", target);
      formData.set("file", file);

      const response = await fetch("/api/admin/theme/upload", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(String(json?.error || "Upload impossible"));
        return;
      }
      const normalized = normalizeThemeSettings(json?.data?.settings ?? settings);
      setSettings(normalized);
      try {
        window.dispatchEvent(new CustomEvent("theme:updated", { detail: normalized }));
      } catch {}
      toast.success(target === "logo" ? "Logo mis a jour" : "Fond mis a jour");
    } catch {
      toast.error("Erreur reseau pendant l'upload");
    } finally {
      if (target === "logo" && logoInputRef.current) logoInputRef.current.value = "";
      if (target === "background" && backgroundInputRef.current) backgroundInputRef.current.value = "";
      setUploading(null);
    }
  }

  return (
    <div className="space-y-5">
      {/* Preview */}
      <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-4">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-white">Apercu du header</p>
        <div className="mt-3 flex min-h-[120px] items-center justify-center rounded-[4px] border border-[#141433] p-4" style={previewStyle}>
          {settings.showLogo !== false && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.headerLogoUrl}
              alt="Logo header"
              className="mx-auto block h-auto max-h-28 max-w-full"
            />
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="theme-logo-url" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">URL du logo</Label>
            <Input
              id="theme-logo-url"
              value={settings.headerLogoUrl}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  headerLogoUrl: event.target.value,
                }))
              }
              placeholder="/img/mon-logo.gif"
              className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleUpload("logo", file);
              }}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploading === "logo"}
              className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
            >
              {uploading === "logo" ? "Upload..." : "Importer logo"}
            </Button>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2.5">
            <input
              type="checkbox"
              checked={settings.showLogo !== false}
              onChange={(e) => setSettings((prev) => ({ ...prev, showLogo: e.target.checked }))}
              className="h-4 w-4 rounded border-[#141433] bg-[#25254D] accent-[#2596FF]"
            />
            <span className="text-[12px] font-bold text-[#DDD]">Afficher le logo sur le header</span>
          </label>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="theme-bg-color" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">Couleur de fond</Label>
            <div className="flex items-center gap-2">
              <Input
                id="theme-bg-color"
                type="color"
                value={colorInputValue}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    headerBackgroundColor: event.target.value,
                  }))
                }
                className="h-[40px] w-14 rounded-[4px] border-[#141433] bg-[#1F1F3E] p-1"
              />
              <Input
                value={settings.headerBackgroundColor}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    headerBackgroundColor: event.target.value,
                  }))
                }
                className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white"
                placeholder="#204E84"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-bg-url" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">Image de fond (optionnel)</Label>
            <Input
              id="theme-bg-url"
              value={settings.headerBackgroundImageUrl ?? ""}
              onChange={(event) =>
                setSettings((prev) => ({
                  ...prev,
                  headerBackgroundImageUrl: event.target.value || null,
                }))
              }
              placeholder="/uploads/theme/background.jpg"
              className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={backgroundInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleUpload("background", file);
              }}
              className="hidden"
            />
            <Button
              type="button"
              onClick={() => backgroundInputRef.current?.click()}
              disabled={uploading === "background"}
              className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
            >
              {uploading === "background" ? "Upload..." : "Importer fond"}
            </Button>
            <Button
              type="button"
              onClick={() =>
                setSettings((prev) => ({
                  ...prev,
                  headerBackgroundImageUrl: null,
                }))
              }
              className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] text-xs text-admin-text-tertiary hover:bg-[#303060] hover:text-white"
            >
              Retirer image
            </Button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 sm:justify-end">
        <Button
          type="button"
          disabled={saving || loading}
          onClick={() => void saveSettings(DEFAULT_THEME_SETTINGS)}
          className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
        >
          Valeurs par defaut
        </Button>
        <Button
          type="button"
          disabled={saving || loading}
          onClick={() => void saveSettings(settings)}
          className="h-[36px] rounded-[4px] bg-[#2596FF] text-xs font-bold uppercase text-white hover:bg-[#2976E8]"
        >
          {saving ? "..." : "Enregistrer"}
        </Button>
      </div>

      {loading && <p className="text-xs text-admin-text-tertiary">Chargement...</p>}
    </div>
  );
}
