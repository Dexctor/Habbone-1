"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fallback below */
  }
  // Fallback pour navigateurs anciens / contexte non-secure
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export default function ContentWithLightbox({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  // Anime un flash vert "Copié !" sur le chip pour confirmer visuellement
  // la copie, en plus du toast (utile si Sonner ne s'affiche pas pour une
  // raison quelconque, ou pour rassurer l'utilisateur sur son geste).
  const flashChipCopied = (chip: HTMLAnchorElement) => {
    chip.classList.add("roomid-chip--copied");
    const before = chip.getAttribute("data-original-text") ?? chip.textContent ?? "";
    if (!chip.hasAttribute("data-original-text")) {
      chip.setAttribute("data-original-text", before);
    }
    chip.textContent = "Copié !";
    window.setTimeout(() => {
      chip.classList.remove("roomid-chip--copied");
      const orig = chip.getAttribute("data-original-text");
      if (orig) chip.textContent = orig;
    }, 1200);
  };

  const handleClick = useCallback((e: MouseEvent) => {
    const target = e.target as HTMLElement;

    // RoomID chip — copie ":roomid <id>" dans le presse-papier au clic.
    // closest() couvre le cas où le clic tombe sur l'icône ::before ou le texte.
    const chip = target.closest<HTMLAnchorElement>("a.roomid-chip");
    if (chip) {
      // preventDefault doit s'exécuter immédiatement (sans attendre la
      // promesse) sinon le navigateur a le temps de traiter href="#..." et
      // de scroller vers une ancre.
      e.preventDefault();
      e.stopPropagation();
      const id = (chip.dataset.roomid || "").replace(/[^0-9]/g, "");
      if (!id) return;
      const text = `:roomid ${id}`;
      void copyToClipboard(text).then((ok) => {
        if (ok) {
          flashChipCopied(chip);
          toast.success("RoomID copiée !", {
            description: text,
            duration: 2500,
          });
        } else {
          toast.error("Impossible de copier dans le presse-papier", {
            description: "Sélectionne le texte manuellement et fais Ctrl+C.",
          });
        }
      });
      return;
    }

    if (target.tagName === "IMG") {
      e.preventDefault();
      e.stopPropagation();
      const imgSrc = (target as HTMLImageElement).src;
      if (imgSrc) setSrc(imgSrc);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Capture phase pour intercepter le clic AVANT que le navigateur
    // traite le href="#..." et déclenche un scroll vers l'ancre.
    el.addEventListener("click", handleClick, true);
    return () => el.removeEventListener("click", handleClick, true);
  }, [handleClick]);

  // Close on Escape
  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSrc(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [src]);

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        data-lightbox-container=""
        dangerouslySetInnerHTML={{ __html: html }}
      />

      <style>{`
        [data-lightbox-container] img {
          cursor: zoom-in;
          transition: opacity 0.15s;
        }
        [data-lightbox-container] img:hover {
          opacity: 0.85;
        }
      `}</style>

      {src && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setSrc(null)}
        >
          <button
            type="button"
            onClick={() => setSrc(null)}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
            aria-label="Fermer"
          >
            <X className="h-6 w-6" />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
