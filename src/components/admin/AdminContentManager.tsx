"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Images,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from "@/server/directus/types";
import { ContentListItem } from "@/components/admin/content/ContentList";
import { ContentDetailPanel } from "@/components/admin/content/ContentDetail";
import {
  CONTENT_META,
  CONTENT_ORDER,
  PAGE_SIZE,
  type ContentType,
  type ServerActionFn,
} from "@/components/admin/content/content-helpers";

interface AdminContentManagerProps {
  topics: AdminTopic[];
  posts: AdminPost[];
  news: AdminArticle[];
  forumComments: AdminForumComment[];
  newsComments: AdminNewsComment[];
  topicTitleById: Record<number, string>;
  updateTopic: ServerActionFn;
  deleteTopic: ServerActionFn;
  updatePost: ServerActionFn;
  deletePost: ServerActionFn;
  updateArticle: ServerActionFn;
  deleteArticle: ServerActionFn;
  updateForumComment: ServerActionFn;
  deleteForumComment: ServerActionFn;
  updateNewsComment: ServerActionFn;
  deleteNewsComment: ServerActionFn;
  stories: AdminStory[];
  updateStory: ServerActionFn;
  deleteStory: ServerActionFn;
}

/* ------------------------------------------------------------------ */
/*  Icons per content type (kept here instead of content-helpers to    */
/*  keep that file icon-agnostic).                                     */
/* ------------------------------------------------------------------ */

const CONTENT_ICONS: Record<ContentType, React.ComponentType<{ className?: string }>> = {
  articles: Newspaper,
  topics: MessagesSquare,
  posts: MessageCircle,
  forumComments: MessageCircle,
  newsComments: MessageCircle,
  stories: Images,
};

export default function AdminContentManager(props: AdminContentManagerProps) {
  const { topics, posts, news, forumComments, newsComments, stories, topicTitleById } = props;
  const [contentType, setContentType] = useState<ContentType>("articles");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // On mobile we toggle between "list" and "detail" views; desktop shows both
  // side-by-side so this flag is ignored ≥ xl breakpoint.
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const searchLower = search.trim().toLowerCase();

  const countsByType = useMemo<Record<ContentType, number>>(
    () => ({
      topics: topics.length,
      posts: posts.length,
      articles: news.length,
      forumComments: forumComments.length,
      newsComments: newsComments.length,
      stories: stories.length,
    }),
    [topics.length, posts.length, news.length, forumComments.length, newsComments.length, stories.length],
  );

  const handleTypeChange = useCallback((type: ContentType) => {
    setContentType(type);
    setSearch("");
    setPage(1);
    setSelectedId(null);
    setIsEditing(false);
    setMobileShowDetail(false);
  }, []);

  const filteredData = useMemo(() => {
    const matches = (value: string) => !searchLower || value.toLowerCase().includes(searchLower);

    switch (contentType) {
      case "topics":
        return topics.filter((topic) =>
          matches(`${topic.titulo ?? ""} ${topic.autor ?? ""} ${topic.conteudo ?? ""}`),
        );
      case "posts":
        return posts.filter((post) => matches(`${post.autor ?? ""} ${topicTitleById[post.id_topico ?? 0] ?? ""}`));
      case "articles":
        return news.filter((article) =>
          matches(`${article.titulo ?? ""} ${article.autor ?? ""} ${article.descricao ?? ""} ${article.noticia ?? ""}`),
        );
      case "forumComments":
        return forumComments.filter((comment) =>
          matches(`${comment.autor ?? ""} ${comment.id_forum ?? ""} ${comment.comentario ?? ""}`),
        );
      case "newsComments":
        return newsComments.filter((comment) =>
          matches(`${comment.autor ?? ""} ${comment.id_noticia ?? ""} ${comment.comentario ?? ""}`),
        );
      case "stories":
        return stories.filter((story) => matches(`${story.titulo ?? ""} ${story.autor ?? ""}`));
      default:
        return [];
    }
  }, [contentType, topics, posts, news, forumComments, newsComments, stories, topicTitleById, searchLower]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedData = filteredData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return filteredData.find((item) => (item as { id: number }).id === selectedId) || null;
  }, [filteredData, selectedId]);

  // When the filter removes the current selection, auto-pick the first item.
  useEffect(() => {
    if (selectedItem) return;
    const firstItem = filteredData[0] as { id: number } | undefined;
    setSelectedId(firstItem?.id ?? null);
    setIsEditing(false);
  }, [filteredData, selectedItem]);

  const actionSet = useMemo(() => {
    switch (contentType) {
      case "topics":
        return { update: props.updateTopic, remove: props.deleteTopic };
      case "posts":
        return { update: props.updatePost, remove: props.deletePost };
      case "articles":
        return { update: props.updateArticle, remove: props.deleteArticle };
      case "forumComments":
        return { update: props.updateForumComment, remove: props.deleteForumComment };
      case "newsComments":
        return { update: props.updateNewsComment, remove: props.deleteNewsComment };
      case "stories":
        return { update: props.updateStory, remove: props.deleteStory };
    }
  }, [contentType, props]);

  const activeMeta = CONTENT_META[contentType];
  const ActiveIcon = CONTENT_ICONS[contentType];

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      const formData = new FormData();
      formData.set("id", String(deleteConfirmId));
      await actionSet.remove(formData);
      setSelectedId(null);
      setIsEditing(false);
      setMobileShowDetail(false);
    } finally {
      setDeleteLoading(false);
      setDeleteConfirmId(null);
    }
  };

  return (
    <>
      <ConfirmDialog
        open={deleteConfirmId !== null}
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmId(null)}
        title="Supprimer ce contenu ?"
        description={`L'élément #${deleteConfirmId} (${activeMeta.label.toLowerCase()}) sera supprimé définitivement. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        variant="danger"
        loading={deleteLoading}
        icon={<Trash2 className="h-5 w-5" />}
      />

      <div className="space-y-4">
        {/* ── Type selector: icon cards ─────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {CONTENT_ORDER.map((type) => {
            const TypeIcon = CONTENT_ICONS[type];
            const active = contentType === type;
            const count = countsByType[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={cn(
                  "group flex items-center gap-2.5 rounded-[6px] border px-3 py-2.5 text-left transition-all",
                  active
                    ? "border-[#2596FF] bg-[#2596FF]/10 shadow-[0_0_0_1px_rgba(37,150,255,0.4)]"
                    : "border-[#141433] bg-[#1F1F3E] hover:border-[#2596FF]/40 hover:bg-[#25254D]",
                )}
                aria-pressed={active}
              >
                <div
                  className={cn(
                    "grid h-8 w-8 shrink-0 place-items-center rounded-[4px]",
                    active ? "bg-[#2596FF] text-white" : "bg-[#25254D] text-admin-text-tertiary group-hover:text-white",
                  )}
                >
                  <TypeIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[12px] font-semibold",
                      active ? "text-white" : "text-[#DDD]",
                    )}
                  >
                    {CONTENT_META[type].label}
                  </p>
                  <p
                    className={cn(
                      "text-[10px] font-mono",
                      active ? "text-white/70" : "text-admin-text-tertiary",
                    )}
                  >
                    {count.toLocaleString("fr-FR")}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar: search + counter ─────────────────────────────── */}
        <div className="flex flex-col gap-3 rounded-[6px] border border-[#141433] bg-[#1F1F3E] p-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 sm:min-w-[200px]">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[4px] bg-[#25254D] text-[#2596FF]">
              <ActiveIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-white">{activeMeta.label}</p>
              <p className="truncate text-[11px] text-admin-text-tertiary">
                {activeMeta.description}
              </p>
            </div>
          </div>

          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-text-tertiary" />
            <Input
              placeholder="Rechercher par titre, auteur, contenu…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
                setSelectedId(null);
                setIsEditing(false);
              }}
              className="h-[42px] rounded-[4px] border-[#141433] bg-[#25254D] pl-10 pr-10 text-white placeholder:text-admin-text-tertiary"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-[3px] text-admin-text-tertiary hover:bg-white/10 hover:text-white"
                aria-label="Effacer la recherche"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-admin-text-tertiary sm:min-w-[120px] sm:justify-end">
            {searchLower ? (
              <span>
                <span className="font-bold text-white">{filteredData.length}</span>
                {" / "}
                <span>{countsByType[contentType]} résultats</span>
              </span>
            ) : (
              <span>
                <span className="font-bold text-white">{countsByType[contentType]}</span> élément
                {countsByType[contentType] > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── Main content: list + detail ───────────────────────────── */}
        <div
          className={cn(
            "grid gap-4",
            // desktop layout with sticky detail panel
            "xl:grid-cols-[380px_minmax(0,1fr)]",
          )}
        >
          {/* List — hidden on mobile when detail is open */}
          <div
            className={cn(
              "overflow-hidden rounded-[6px] border border-[#141433] bg-[#1F1F3E]",
              mobileShowDetail && "hidden xl:block",
            )}
          >
            <div className="flex items-center justify-between border-b border-[#141433] px-4 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">
                {searchLower ? "Résultats" : "Liste"}
              </p>
              <span className="text-[10px] font-mono text-admin-text-tertiary">
                {filteredData.length.toLocaleString("fr-FR")}
              </span>
            </div>

            <ScrollArea className="h-[560px]">
              {paginatedData.length === 0 ? (
                <EmptyState
                  icon={<ActiveIcon className="h-8 w-8" />}
                  title={searchLower ? "Aucun résultat" : activeMeta.emptyHint}
                  hint={
                    searchLower
                      ? `Aucun ${activeMeta.label.toLowerCase()} ne correspond à « ${search} ».`
                      : undefined
                  }
                />
              ) : (
                <div>
                  {paginatedData.map((item) => (
                    <ContentListItem
                      key={`${contentType}-${(item as { id: number }).id}`}
                      item={item}
                      contentType={contentType}
                      topicTitleById={topicTitleById}
                      isSelected={selectedId === (item as { id: number }).id}
                      onSelect={() => {
                        setSelectedId((item as { id: number }).id);
                        setIsEditing(false);
                        setMobileShowDetail(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-[#141433] px-4 py-2.5">
                <span className="text-[11px] text-admin-text-tertiary">
                  Page {safePage} sur {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={safePage <= 1}
                    onClick={() => setPage(Math.max(1, safePage - 1))}
                    className="h-7 w-7 rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060] disabled:opacity-30"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                    className="h-7 w-7 rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060] disabled:opacity-30"
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Detail panel — full width on mobile when open */}
          <div
            className={cn(
              "min-h-[620px] overflow-hidden rounded-[6px] border border-[#141433] bg-[#1F1F3E]",
              !mobileShowDetail && "hidden xl:block",
            )}
          >
            {/* Mobile: back to list */}
            {mobileShowDetail && selectedItem && (
              <div className="flex items-center gap-2 border-b border-[#141433] px-3 py-2 xl:hidden">
                <button
                  type="button"
                  onClick={() => setMobileShowDetail(false)}
                  className="flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[12px] text-admin-text-tertiary hover:bg-white/5 hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Retour
                </button>
              </div>
            )}

            {!selectedItem ? (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="Aucun contenu sélectionné"
                hint="Choisis un élément dans la liste pour voir ses détails."
              />
            ) : (
              <ContentDetailPanel
                key={`${contentType}-${(selectedItem as { id: number }).id}`}
                item={selectedItem}
                contentType={contentType}
                topicTitleById={topicTitleById}
                isEditing={isEditing}
                onEdit={() => setIsEditing(true)}
                onCancelEdit={() => setIsEditing(false)}
                onSave={actionSet.update}
                onDelete={() => setDeleteConfirmId((selectedItem as { id: number }).id)}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-[#25254D] text-admin-text-tertiary/60">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-white">{title}</p>
      {hint && <p className="max-w-[320px] text-[11px] text-admin-text-tertiary">{hint}</p>}
    </div>
  );
}

