"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

// Regex pour détecter ":roomid 12345" en texte brut (espace classique ou
// insécable, 1 à 12 chiffres). On garde le \b à la fin pour ne pas matcher
// au milieu d'un autre mot. On exige au moins un caractère blanc avant ":"
// (ou début de chaîne) pour ne pas matcher une URL ou une ancre fragmentée.
const ROOMID_REGEX = /(^|[\s>])(:roomid)[\s ]+(\d{1,12})\b/gi;

async function copyToClipboard(text: string): Promise<boolean> {
  console.log("[RoomID] copyToClipboard called with:", text);
  console.log("[RoomID] navigator.clipboard available?", !!navigator.clipboard);
  console.log("[RoomID] window.isSecureContext?", window.isSecureContext);

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      console.log("[RoomID] ✅ navigator.clipboard.writeText OK");
      return true;
    }
    console.log("[RoomID] navigator.clipboard.writeText not available, trying fallback");
  } catch (err) {
    console.warn("[RoomID] navigator.clipboard.writeText threw:", err);
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
    console.log("[RoomID] execCommand fallback result:", ok);
    return ok;
  } catch (err) {
    console.error("[RoomID] execCommand fallback threw:", err);
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
    console.log("[RoomID] click event captured. target:", target.tagName, target);

    // RoomID chip — copie ":roomid <id>" dans le presse-papier au clic.
    // closest() couvre le cas où le clic tombe sur l'icône ::before ou le texte.
    const chip = target.closest<HTMLAnchorElement>("a.roomid-chip");
    console.log("[RoomID] chip found?", !!chip, chip);
    if (chip) {
      // preventDefault doit s'exécuter immédiatement (sans attendre la
      // promesse) sinon le navigateur a le temps de traiter href="#..." et
      // de scroller vers une ancre.
      e.preventDefault();
      e.stopPropagation();
      // L'ID peut venir de 3 endroits, par ordre de fiabilité :
      //  1. data-roomid (notre format canonique)
      //  2. href="#roomid-12345" (fallback si TipTap/sanitizer a strippé data-*)
      //  3. textContent ":roomid 12345" (dernier recours)
      let id = (chip.dataset.roomid || "").replace(/[^0-9]/g, "");
      if (!id) {
        const href = chip.getAttribute("href") || "";
        const m = href.match(/#roomid-(\d+)/i);
        if (m) id = m[1];
      }
      if (!id) {
        const txt = chip.textContent || "";
        const m = txt.match(/(\d{1,12})/);
        if (m) id = m[1];
      }
      console.log("[RoomID] extracted id:", id, "from data-roomid:", chip.dataset.roomid, "href:", chip.getAttribute("href"), "text:", chip.textContent);
      if (!id) {
        console.warn("[RoomID] no valid id, aborting");
        return;
      }
      const text = `:roomid ${id}`;
      console.log("[RoomID] about to copy:", text);
      void copyToClipboard(text).then((ok) => {
        console.log("[RoomID] copy result:", ok);
        if (ok) {
          flashChipCopied(chip);
          console.log("[RoomID] calling toast.success");
          toast.success("RoomID copiée !", {
            description: text,
            duration: 2500,
          });
        } else {
          console.log("[RoomID] calling toast.error");
          toast.error("Impossible de copier dans le presse-papier", {
            description: "Sélectionne le texte manuellement et fais Ctrl+C.",
          });
        }
      }).catch((err) => {
        console.error("[RoomID] copy promise rejected:", err);
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
    if (!el) {
      console.warn("[RoomID] containerRef is null, cannot attach listener");
      return;
    }
    console.log("[RoomID] attaching click listener to:", el);
    // Capture phase pour intercepter le clic AVANT que le navigateur
    // traite le href="#..." et déclenche un scroll vers l'ancre.
    el.addEventListener("click", handleClick, true);
    return () => {
      console.log("[RoomID] removing click listener");
      el.removeEventListener("click", handleClick, true);
    };
  }, [handleClick]);

  // Auto-transformation : scanne le HTML rendu et remplace toute occurrence
  // de ":roomid 12345" en texte brut par un chip cliquable. Permet aux
  // anciens articles (où le rédacteur a tapé manuellement le texte) de
  // bénéficier de la copie en un clic, sans avoir à les rééditer.
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    console.log("[RoomID] auto-transform useEffect running, html length:", html.length);
    console.log("[RoomID] html preview (1st 200 chars):", html.slice(0, 200));
    const hasInHtml = ROOMID_REGEX.test(html);
    ROOMID_REGEX.lastIndex = 0;
    console.log("[RoomID] regex test on raw html:", hasInHtml);

    // On parcourt uniquement les nœuds TEXTE (TreeWalker), pour ne pas
    // toucher les <a class="roomid-chip"> déjà existants ni le contenu des
    // <code>/<pre> où l'utilisateur veut peut-être afficher le texte tel quel.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        // Skip code/pre/a (déjà cliquable ou contenu littéral)
        if (parent.closest("code, pre, a")) return NodeFilter.FILTER_REJECT;
        if (!ROOMID_REGEX.test(node.nodeValue || "")) return NodeFilter.FILTER_REJECT;
        ROOMID_REGEX.lastIndex = 0; // reset après .test()
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const targets: Text[] = [];
    let n: Node | null = walker.nextNode();
    while (n) {
      targets.push(n as Text);
      n = walker.nextNode();
    }
    console.log("[RoomID] text nodes matched by regex:", targets.length);
    targets.forEach((t, i) => {
      console.log(`[RoomID]   #${i}:`, JSON.stringify(t.nodeValue));
    });

    // Aussi : compter les chips DÉJÀ présents dans le HTML
    const existingChips = root.querySelectorAll("a.roomid-chip");
    console.log("[RoomID] existing chips in DOM (already clickable):", existingChips.length);

    let chipsCreated = 0;
    for (const textNode of targets) {
      const original = textNode.nodeValue || "";
      ROOMID_REGEX.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = ROOMID_REGEX.exec(original)) !== null) {
        const full = match[0];
        const prefix = match[1];
        const id = match[3];
        const start = match.index;
        // Texte avant le match (incluant le caractère de prefix : espace
        // ou début de chaîne — on garde l'espace pour ne pas coller deux mots)
        if (start + prefix.length > lastIndex) {
          fragment.appendChild(
            document.createTextNode(original.slice(lastIndex, start + prefix.length)),
          );
        }
        // Le chip lui-même
        const chip = document.createElement("a");
        chip.className = "roomid-chip";
        chip.setAttribute("href", `#roomid-${id}`);
        chip.setAttribute("data-roomid", id);
        chip.setAttribute("rel", "nofollow noopener noreferrer");
        chip.textContent = `:roomid ${id}`;
        fragment.appendChild(chip);
        chipsCreated++;
        lastIndex = start + full.length;
      }
      if (lastIndex < original.length) {
        fragment.appendChild(document.createTextNode(original.slice(lastIndex)));
      }
      textNode.parentNode?.replaceChild(fragment, textNode);
    }
    console.log("[RoomID] chips créés par auto-transform:", chipsCreated);
    const finalChips = root.querySelectorAll("a.roomid-chip");
    console.log("[RoomID] chips totaux après transform:", finalChips.length);
    finalChips.forEach((c, i) => {
      const a = c as HTMLAnchorElement;
      console.log(`[RoomID]   chip #${i}: data-roomid="${a.dataset.roomid}", text="${a.textContent}", innerHTML.length=${a.innerHTML.length}`);
    });
  }, [html]);

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
