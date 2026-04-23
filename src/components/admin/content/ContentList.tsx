"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type {
  ForumTopicRecord as AdminTopic,
  StoryRecord as AdminStory,
} from "@/server/directus/types";
import {
  type ContentItem,
  type ContentType,
  getItemTitle,
  resolveItemDate,
} from "./content-helpers";

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

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full border-b border-[#141433] px-4 py-3 text-left transition-colors last:border-b-0",
        isSelected
          ? "bg-[#2596FF]/15 text-white"
          : "text-[color:var(--foreground)]/70 hover:bg-[#25254D]",
      )}
    >
      <p className="truncate text-sm font-semibold text-white">{title}</p>
      <p className="mt-0.5 text-[11px] text-admin-text-tertiary">
        #{itemId} - {author}
        {date ? ` - ${formatDateTime(date)}` : ""}
      </p>
      <StatusBadges item={item} contentType={contentType} />
    </button>
  );
}

export function StatusBadges({
  item,
  contentType,
}: {
  item: ContentItem;
  contentType: ContentType;
}) {
  if (contentType === "topics") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {(item as AdminTopic).fixo && (
          <Badge className="border-0 bg-[#FFC800]/15 text-[10px] text-[#FFC800]">Épinglé</Badge>
        )}
        {(item as AdminTopic).fechado && (
          <Badge className="border-0 bg-[#25254D] text-[10px] text-admin-text-tertiary">Fermé</Badge>
        )}
      </div>
    );
  }

  if (contentType === "stories") {
    const status = (item as AdminStory).status || "public";
    return (
      <div className="mt-1">
        <Badge
          className={cn(
            "border-0 text-[10px]",
            status === "public"
              ? "bg-green-500/15 text-green-400"
              : "bg-[#25254D] text-admin-text-tertiary",
          )}
        >
          {status}
        </Badge>
      </div>
    );
  }

  return null;
}
