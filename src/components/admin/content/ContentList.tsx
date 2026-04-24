"use client";

import { ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type {
  ForumTopicRecord as AdminTopic,
  StoryRecord as AdminStory,
  NewsRecord as AdminArticle,
} from "@/server/directus/types";
import {
  type ContentItem,
  type ContentType,
  extractExcerpt,
  getItemTitle,
  resolveAssetUrl,
  resolveItemDate,
} from "./content-helpers";

/* ------------------------------------------------------------------ */
/*  List item                                                          */
/* ------------------------------------------------------------------ */

export function ContentListItem({
  item,
  contentType,
  topicTitleById,
  isSelected,
  onSelect,
}: {
  item: ContentItem;
  contentType: ContentType;
  topicTitleById: Record<number, string>;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const itemId = (item as { id: number }).id;
  const title = getItemTitle(item, contentType, topicTitleById);
  const author = (item as { autor?: string | null }).autor || "Inconnu";
  const date = resolveItemDate(item);

  // Thumbnail source varies per content type. We try every reasonable field
  // and fall back to null (rendered as a placeholder square).
  const thumbnail = resolveAssetUrl(
    (item as { imagem?: string | null; image?: string | null }).imagem ||
      (item as { image?: string | null }).image ||
      null,
  );

  // Excerpt: for articles we have `descricao`, for topics the `conteudo`,
  // for comments the `comentario` body. Others (posts / stories) fall back
  // to whatever free-form text exists.
  const rawBody =
    (item as { descricao?: string | null }).descricao ||
    (item as { noticia?: string | null }).noticia ||
    (item as { conteudo?: string | null }).conteudo ||
    (item as { comentario?: string | null }).comentario ||
    "";
  const excerpt = extractExcerpt(rawBody, 110);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group flex w-full items-start gap-3 border-b border-[#141433]/80 px-3 py-3 text-left transition-colors last:border-b-0",
        isSelected
          ? "bg-[#2596FF]/15 ring-1 ring-inset ring-[#2596FF]/40"
          : "hover:bg-[#25254D]/70",
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-[56px] w-[56px] shrink-0 overflow-hidden rounded-[6px] border border-[#141433] bg-[#25254D]">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnail}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-admin-text-tertiary/50">
            <ImageIcon className="h-5 w-5" />
          </div>
        )}
      </div>

      {/* Main column */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-semibold",
            isSelected ? "text-white" : "text-white group-hover:text-white",
          )}
        >
          {title}
        </p>
        {excerpt && (
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-admin-text-tertiary">
            {excerpt}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-admin-text-tertiary">
          <span className="font-mono">#{itemId}</span>
          <span className="opacity-40">•</span>
          <span className="truncate max-w-[110px]">{author}</span>
          {date && (
            <>
              <span className="opacity-40">•</span>
              <span>{formatDateTime(date)}</span>
            </>
          )}
        </div>
        <StatusBadges item={item} contentType={contentType} />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badges (re-used by ContentDetail header)                    */
/* ------------------------------------------------------------------ */

export function StatusBadges({
  item,
  contentType,
}: {
  item: ContentItem;
  contentType: ContentType;
}) {
  if (contentType === "topics") {
    const topic = item as AdminTopic;
    const chips: { label: string; tone: "warning" | "neutral" | "danger" }[] = [];
    if (topic.fixo) chips.push({ label: "Épinglé", tone: "warning" });
    if (topic.fechado) chips.push({ label: "Fermé", tone: "neutral" });
    if (!chips.length) return null;
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {chips.map((chip) => (
          <ToneBadge key={chip.label} tone={chip.tone}>
            {chip.label}
          </ToneBadge>
        ))}
      </div>
    );
  }

  if (contentType === "stories") {
    const status = (item as AdminStory).status || "public";
    const tone: "success" | "neutral" = status === "public" ? "success" : "neutral";
    return (
      <div className="mt-1.5">
        <ToneBadge tone={tone}>{status}</ToneBadge>
      </div>
    );
  }

  if (contentType === "articles") {
    const status = (item as AdminArticle).status || "";
    if (!status) return null;
    const tone: "success" | "warning" | "neutral" =
      status === "published" || status === "publicado"
        ? "success"
        : status === "draft" || status === "rascunho"
          ? "warning"
          : "neutral";
    const label =
      status === "published" || status === "publicado"
        ? "Publié"
        : status === "draft" || status === "rascunho"
          ? "Brouillon"
          : status;
    return (
      <div className="mt-1.5">
        <ToneBadge tone={tone}>{label}</ToneBadge>
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Small badge helper                                                 */
/* ------------------------------------------------------------------ */

function ToneBadge({
  tone,
  children,
}: {
  tone: "success" | "warning" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  const toneClasses: Record<typeof tone, string> = {
    success: "bg-green-500/15 text-green-400",
    warning: "bg-[#FFC800]/15 text-[#FFC800]",
    danger: "bg-red-500/15 text-red-400",
    neutral: "bg-[#25254D] text-admin-text-tertiary",
  };
  return (
    <Badge className={cn("border-0 px-1.5 py-0 text-[10px] font-medium", toneClasses[tone])}>
      {children}
    </Badge>
  );
}
