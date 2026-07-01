"use client";

import { useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { ImagePlus, Link2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export type AdminImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  endpoint?: string;
  label?: string;
  hint?: string;
  accept?: string;
  maxMb?: number;
  pixelated?: boolean;
  resolvePreview?: (value: string) => string;
  onPreviewError?: (event: SyntheticEvent<HTMLImageElement>) => void;
};

export function AdminImageUpload({
  value,
  onChange,
  endpoint = "/api/admin/upload",
  label = "Image",
  hint = "PNG, JPG, GIF, WebP - max 5 Mo",
  accept = "image/png,image/jpeg,image/gif,image/webp",
  maxMb = 5,
  pixelated = false,
  resolvePreview = (url) => url,
  onPreviewError,
}: AdminImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Seules les images sont acceptées");
      return;
    }
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (max ${maxMb} Mo)`);
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(endpoint, { method: "POST", body: formData });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Erreur de téléversement");

      const nextUrl = String(json?.url || json?.id || "");
      if (!nextUrl) throw new Error("Réponse d'upload invalide");

      onChange(nextUrl);
      toast.success("Image téléversée");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur lors du téléversement");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const chooseFile = () => inputRef.current?.click();

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.06em] text-admin-text-tertiary">
        {label}
      </label>

      {value ? (
        <div className="relative inline-block rounded-[8px] border border-white/10 bg-admin-bg-800 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvePreview(value)}
            alt="Aperçu"
            className={cn("max-h-[120px] max-w-[200px] rounded-[4px] object-contain", pixelated && "image-pixelated")}
            onError={onPreviewError}
          />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-admin-brand-red-strong text-white shadow-lg transition-transform hover:scale-110"
            title="Supprimer l'image"
            aria-label="Supprimer l'image"
          >
            <X className="h-3 w-3" />
          </button>
          <p className="mt-2 max-w-[200px] truncate text-[10px] text-admin-text-tertiary">{value}</p>
        </div>
      ) : (
        <div
          onClick={chooseFile}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleUpload(file);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragOver(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              chooseFile();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Cliquer ou glisser-déposer une image"
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed px-6 py-8 transition-colors",
            dragOver
              ? "border-admin-brand-blue bg-admin-brand-blue/5"
              : "border-white/10 bg-admin-bg-800 hover:border-admin-brand-blue/40 hover:bg-admin-brand-blue/[0.03]",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          {uploading ? (
            <>
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-admin-brand-blue/30 border-t-admin-brand-blue" />
              <span className="text-[12px] font-medium text-admin-text-tertiary">Téléversement en cours...</span>
            </>
          ) : (
            <>
              <div className="grid h-12 w-12 place-items-center rounded-full bg-admin-brand-blue/10 text-admin-brand-blue">
                <ImagePlus className="h-6 w-6" />
              </div>
              <div className="text-center">
                <p className="text-[13px] font-semibold text-white">Cliquer ou glisser-déposer</p>
                <p className="mt-0.5 text-[11px] text-admin-text-tertiary">{hint}</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
        className="hidden"
        aria-hidden="true"
      />

      {!value && !showUrlInput && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-admin-text-tertiary">ou</span>
          <button
            type="button"
            onClick={() => setShowUrlInput(true)}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-admin-brand-blue/80 transition-colors hover:text-admin-brand-blue"
          >
            <Link2 className="h-3 w-3" />
            Coller une URL
          </button>
        </div>
      )}

      {!value && showUrlInput && (
        <div className="flex flex-col gap-2 rounded-[6px] border border-white/10 bg-admin-bg-800 p-2 sm:flex-row">
          <input
            type="url"
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            placeholder="https://..."
            className="h-9 min-w-0 flex-1 rounded-[5px] border border-white/10 bg-admin-bg-900 px-3 text-[12px] text-white placeholder:text-admin-text-muted focus:border-admin-brand-blue/50 focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                const next = urlDraft.trim();
                if (!next) return;
                onChange(next);
                setShowUrlInput(false);
                setUrlDraft("");
              }}
              className="h-9 rounded-[5px] bg-admin-brand-blue px-3 text-[12px] font-bold text-white hover:bg-admin-brand-blue-hover"
            >
              Ajouter
            </button>
            <button
              type="button"
              onClick={() => {
                setShowUrlInput(false);
                setUrlDraft("");
              }}
              className="h-9 rounded-[5px] bg-white/[0.05] px-3 text-[12px] font-bold text-admin-text-tertiary hover:bg-white/[0.08] hover:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
