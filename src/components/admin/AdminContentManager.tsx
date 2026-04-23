"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, Search, Trash2 } from "lucide-react";
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
  CONTENT_ORDER,
  CONTENT_SECTIONS,
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

export default function AdminContentManager(props: AdminContentManagerProps) {
  const { topics, posts, news, forumComments, newsComments, stories, topicTitleById } = props;
  const [contentType, setContentType] = useState<ContentType>("articles");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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
  }, []);

  const filteredData = useMemo(() => {
    const matches = (value: string) => !searchLower || value.toLowerCase().includes(searchLower);

    switch (contentType) {
      case "topics":
        return topics.filter((topic) => matches(`${topic.titulo ?? ""} ${topic.autor ?? ""}`));
      case "posts":
        return posts.filter((post) => matches(`${post.autor ?? ""} ${topicTitleById[post.id_topico ?? 0] ?? ""}`));
      case "articles":
        return news.filter((article) => matches(`${article.titulo ?? ""} ${article.autor ?? ""}`));
      case "forumComments":
        return forumComments.filter((comment) => matches(`${comment.autor ?? ""} ${comment.id_forum ?? ""}`));
      case "newsComments":
        return newsComments.filter((comment) => matches(`${comment.autor ?? ""} ${comment.id_noticia ?? ""}`));
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

  const activeMeta = CONTENT_SECTIONS[contentType];

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setDeleteLoading(true);
    try {
      const formData = new FormData();
      formData.set("id", String(deleteConfirmId));
      await actionSet.remove(formData);
      setSelectedId(null);
      setIsEditing(false);
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
        {/* Type selector tabs */}
        <div className="flex flex-wrap gap-1 rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-1.5">
          {CONTENT_ORDER.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleTypeChange(type)}
              className={cn(
                "rounded-[4px] px-3 py-2 text-xs font-bold uppercase tracking-[0.06em] transition-colors",
                contentType === type
                  ? "bg-[#2596FF] text-white"
                  : "text-admin-text-tertiary hover:bg-[#25254D] hover:text-white",
              )}
            >
              {CONTENT_SECTIONS[type].label}
              <span className="ml-1.5 text-[10px] opacity-70">{countsByType[type]}</span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--foreground)]/35" />
              <Input
                placeholder="Titre, auteur, identifiant..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                  setSelectedId(null);
                  setIsEditing(false);
                }}
                className="h-[45px] rounded-[4px] border-[#141433] bg-[#25254D] pl-10 text-white placeholder:text-[color:var(--foreground)]/35"
              />
            </div>
            <div className="text-xs text-[color:var(--foreground)]/55">
              {filteredData.length} / {countsByType[contentType]}
            </div>
          </div>
        </div>

        {/* Content: list + detail */}
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
          {/* List */}
          <div className="overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
            <div className="border-b border-[#141433] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.08em] text-white">{activeMeta.label}</p>
              <p className="mt-0.5 text-xs text-admin-text-tertiary">{activeMeta.description}</p>
            </div>

            <ScrollArea className="h-[580px]">
              <div>
                {paginatedData.length === 0 ? (
                  <div className="px-4 py-12 text-center text-xs text-admin-text-tertiary">
                    Aucun resultat.
                  </div>
                ) : (
                  paginatedData.map((item) => (
                    <ContentListItem
                      key={`${contentType}-${(item as { id: number }).id}`}
                      item={item}
                      contentType={contentType}
                      topicTitleById={topicTitleById}
                      isSelected={selectedId === (item as { id: number }).id}
                      onSelect={() => {
                        setSelectedId((item as { id: number }).id);
                        setIsEditing(false);
                      }}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-[#141433] px-4 py-2.5 text-xs text-admin-text-tertiary">
              <span>{filteredData.length} element(s)</span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={safePage <= 1}
                  onClick={() => setPage(Math.max(1, safePage - 1))}
                  className="h-7 w-7 rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="min-w-[40px] text-center">{safePage}/{totalPages}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage(Math.min(totalPages, safePage + 1))}
                  className="h-7 w-7 rounded-[4px] border-[#141433] bg-[#25254D] text-white hover:bg-[#303060]"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Detail panel */}
          <div className="min-h-[640px] overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
            {!selectedItem ? (
              <div className="flex h-full min-h-[640px] items-center justify-center px-6 py-10">
                <div className="text-center">
                  <Eye className="mx-auto h-8 w-8 text-[color:var(--foreground)]/30" />
                  <p className="mt-3 text-sm font-bold text-white">Aucun contenu selectionne</p>
                  <p className="mt-1 text-xs text-admin-text-tertiary">
                    Choisis un element dans la liste.
                  </p>
                </div>
              </div>
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
