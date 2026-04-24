"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Palette, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { DEFAULT_THEME_SETTINGS, normalizeThemeSettings, type SiteThemeSettings } from "@/lib/theme-settings";

type UploadTarget = "logo" | "background";
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
const MAX_UPLOAD_MB = 5;

function settingsEqual(a: SiteThemeSettings, b: SiteThemeSettings): boolean {
  return (
    a.headerLogoUrl === b.headerLogoUrl &&
    a.headerBackgroundColor === b.headerBackgroundColor &&
    a.headerBackgroundImageUrl === b.headerBackgroundImageUrl &&
    a.showLogo === b.showLogo
  );
}

export default function AdminThemePanel() {
  const [savedSettings, setSavedSettings] = useState<SiteThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [settings, setSettings] = useState<SiteThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);

  const dirty = !settingsEqual(settings, savedSettings);
  const colorValid = HEX_COLOR_RE.test(settings.headerBackgroundColor);

  // ── Warn before leaving with unsaved changes ────────────────────────
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const previewStyle = useMemo<CSSProperties>(
    () => ({
      backgroundColor: colorValid ? settings.headerBackgroundColor : DEFAULT_THEME_SETTINGS.headerBackgroundColor,
      backgroundImage: settings.headerBackgroundImageUrl ? `url("${settings.headerBackgroundImageUrl}")` : undefined,
      backgroundSize: "cover",
      backgroundPosition: "center",
    }),
    [settings.headerBackgroundColor, settings.headerBackgroundImageUrl, colorValid],
  );

  const colorInputValue = colorValid ? settings.headerBackgroundColor : DEFAULT_THEME_SETTINGS.headerBackgroundColor;

  async function fetchSettings() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/theme", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(String(json?.error || "Impossible de charger le thème"));
        return;
      }
      const normalized = normalizeThemeSettings(json?.data);
      setSettings(normalized);
      setSavedSettings(normalized);
    } catch {
      toast.error("Erreur réseau pendant le chargement");
    } finally {
      setLoading(false);
    }
  }

  const saveSettings = useCallback(async (next: SiteThemeSettings) => {
    if (!HEX_COLOR_RE.test(next.headerBackgroundColor)) {
      toast.error("Couleur de fond invalide (format #RRGGBB attendu)");
      return;
    }
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
        toast.error(String(json?.error || "Impossible d'enregistrer le thème"));
        return;
      }
      const normalized = normalizeThemeSettings(json?.data ?? next);
      setSettings(normalized);
      setSavedSettings(normalized);
      try {
        window.dispatchEvent(new CustomEvent("theme:updated", { detail: normalized }));
      } catch {}
      toast.success("Thème enregistré");
    } catch {
      toast.error("Erreur réseau pendant la sauvegarde");
    } finally {
      setSaving(false);
    }
  }, []);

  async function handleUpload(target: UploadTarget, file: File | null) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`Fichier trop lourd (max ${MAX_UPLOAD_MB} Mo)`);
      return;
    }
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
      setSavedSettings(normalized);
      try {
        window.dispatchEvent(new CustomEvent("theme:updated", { detail: normalized }));
      } catch {}
      toast.success(target === "logo" ? "Logo mis à jour" : "Fond mis à jour");
    } catch {
      toast.error("Erreur réseau pendant l'upload");
    } finally {
      if (target === "logo" && logoInputRef.current) logoInputRef.current.value = "";
      if (target === "background" && backgroundInputRef.current) backgroundInputRef.current.value = "";
      setUploading(null);
    }
  }

  const hasBackgroundImage = !!settings.headerBackgroundImageUrl;

  return (
    <div className="space-y-5">
      {/* ── Preview ── */}
      <section className="rounded-[4px] border border-[#141433] bg-[#25254D] overflow-hidden">
        <header className="flex items-center justify-between px-4 py-2.5 border-b border-[#141433]">
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-white">Aperçu du header</p>
          <span className="text-[10px] uppercase tracking-[0.1em] text-admin-text-tertiary">
            {dirty ? "• Modifications non enregistrées" : "À jour"}
          </span>
        </header>
        <div
          className="flex min-h-[140px] items-center justify-center p-6 transition-colors"
          style={previewStyle}
        >
          {settings.showLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={settings.headerLogoUrl}
              alt="Logo header"
              className="mx-auto block h-auto max-h-28 max-w-full drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = "0.3";
              }}
            />
          ) : (
            <span className="text-xs uppercase tracking-[0.1em] text-white/50">
              Logo masqué
            </span>
          )}
        </div>
      </section>

      {/* ── Settings grid ── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* ── Logo column ── */}
        <section className="space-y-3 rounded-[4px] border border-[#141433] bg-[#1F1F3E]/40 p-4">
          <div className="flex items-center gap-2 pb-1">
            <ImageIcon className="h-4 w-4 text-admin-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-white">Logo</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-logo-url" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">
              URL du logo
            </Label>
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

          <div className="space-y-1">
            <input
              ref={logoInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
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
              className="h-[36px] w-full rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
            >
              <Upload className="mr-2 h-3.5 w-3.5" />
              {uploading === "logo" ? "Envoi en cours..." : "Importer un logo"}
            </Button>
            <p className="text-[10px] text-admin-text-tertiary">
              PNG, JPEG, WebP, GIF, SVG — max {MAX_UPLOAD_MB} Mo
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-2.5 transition-colors hover:bg-[#25254D]">
            <input
              type="checkbox"
              checked={settings.showLogo}
              onChange={(e) => setSettings((prev) => ({ ...prev, showLogo: e.target.checked }))}
              className="h-4 w-4 rounded border-[#141433] bg-[#25254D] accent-[#2596FF]"
            />
            <span className="text-[12px] font-bold text-[#DDD]">Afficher le logo sur le header</span>
          </label>
        </section>

        {/* ── Background column ── */}
        <section className="space-y-3 rounded-[4px] border border-[#141433] bg-[#1F1F3E]/40 p-4">
          <div className="flex items-center gap-2 pb-1">
            <Palette className="h-4 w-4 text-admin-brand-blue" />
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-white">Fond du header</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-bg-color" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">
              Couleur de fond
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="theme-bg-color"
                type="color"
                value={colorInputValue}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    headerBackgroundColor: event.target.value.toUpperCase(),
                  }))
                }
                className="h-[40px] w-14 shrink-0 rounded-[4px] border-[#141433] bg-[#1F1F3E] p-1 cursor-pointer"
              />
              <Input
                value={settings.headerBackgroundColor}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    headerBackgroundColor: event.target.value,
                  }))
                }
                className={`h-[40px] rounded-[4px] bg-[#1F1F3E] text-white font-mono uppercase ${
                  colorValid ? "border-[#141433]" : "border-red-500/70 focus-visible:ring-red-500/30"
                }`}
                placeholder="#204E84"
                maxLength={7}
              />
            </div>
            {!colorValid && (
              <p className="text-[10px] text-red-400">Format attendu : #RRGGBB (ex. #204E84)</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="theme-bg-url" className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">
              Image de fond (optionnel)
            </Label>
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

          <div className="space-y-1">
            <input
              ref={backgroundInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                void handleUpload("background", file);
              }}
              className="hidden"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => backgroundInputRef.current?.click()}
                disabled={uploading === "background"}
                className="h-[36px] flex-1 rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
              >
                <Upload className="mr-2 h-3.5 w-3.5" />
                {uploading === "background" ? "Envoi..." : "Importer"}
              </Button>
              <Button
                type="button"
                disabled={!hasBackgroundImage}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    headerBackgroundImageUrl: null,
                  }))
                }
                className="h-[36px] shrink-0 rounded-[4px] border border-[#141433] bg-[#25254D] px-3 text-xs text-admin-text-tertiary hover:bg-[#303060] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                title={hasBackgroundImage ? "Retirer l'image de fond" : "Aucune image à retirer"}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <p className="text-[10px] text-admin-text-tertiary">
              PNG, JPEG, WebP, GIF, SVG — max {MAX_UPLOAD_MB} Mo
            </p>
          </div>
        </section>
      </div>

      {/* ── Action bar (always visible, but buttons react to state) ── */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          disabled={saving || loading}
          onClick={() => setConfirmReset(true)}
          className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Valeurs par défaut
        </Button>

        <div className="flex items-center gap-3">
          {dirty && (
            <span className="text-[11px] font-medium text-admin-brand-blue">
              Modifications non enregistrées
            </span>
          )}
          <Button
            type="button"
            disabled={saving || loading || !dirty || !colorValid}
            onClick={() => void saveSettings(settings)}
            className="h-[36px] rounded-[4px] bg-[#2596FF] text-xs font-bold uppercase text-white hover:bg-[#2976E8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {loading && <p className="text-xs text-admin-text-tertiary">Chargement...</p>}

      <ConfirmDialog
        open={confirmReset}
        title="Rétablir les valeurs par défaut ?"
        description="Cette action remplacera le logo, la couleur et l'image de fond par les valeurs d'origine. Elle sera enregistrée immédiatement."
        confirmLabel="Rétablir"
        cancelLabel="Annuler"
        onConfirm={() => {
          setConfirmReset(false);
          void saveSettings(DEFAULT_THEME_SETTINGS);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
