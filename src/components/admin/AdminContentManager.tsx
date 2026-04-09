"use client";

import dynamic from "next/dynamic";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronLeft, ChevronRight, Eye, ImagePlus, Link2, Loader2, Pencil, Save, Search, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDateTime } from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from "@/server/directus/types";

const AdminRichEditor = dynamic(() => import("@/components/admin/AdminRichEditor"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-[4px] bg-[#25254D]" />,
});

type ServerActionFn = (formData: FormData) => Promise<void>;
type ContentType = "topics" | "posts" | "articles" | "forumComments" | "newsComments" | "stories";
type ContentItem =
  | AdminTopic
  | AdminPost
  | AdminArticle
  | AdminForumComment
  | AdminNewsComment
  | AdminStory;

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

const PAGE_SIZE = 20;
const DIRECTUS_BASE_URL = (process.env.NEXT_PUBLIC_DIRECTUS_URL || "https://api.habbone.fr").replace(/\/$/, "");
const CONTENT_ORDER: ContentType[] = ["articles", "topics", "posts", "forumComments", "newsComments", "stories"];

const CONTENT_SECTIONS: Record<ContentType, { label: string; description: string }> = {
  topics: { label: "Sujets forum", description: "Editer ou moderer les sujets." },
  posts: { label: "Messages forum", description: "Reponses liees aux sujets." },
  articles: { label: "Articles", description: "Titres, resumes et contenu." },
  forumComments: { label: "Com. forum", description: "Reactions du forum." },
  newsComments: { label: "Com. news", description: "Reactions des articles." },
  stories: { label: "Stories", description: "Titre, media et statut." },
};

export default function AdminContentManager(props: AdminContentManagerProps) {
  const { topics, posts, news, forumComments, newsComments, stories, topicTitleById } = props;
  const [contentType, setContentType] = useState<ContentType>("articles");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

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

  const handleDelete = async (id: number) => {
    if (!confirm(`Supprimer l'element #${id} ?`)) return;
    const formData = new FormData();
    formData.set("id", String(id));
    await actionSet.remove(formData);
    setSelectedId(null);
    setIsEditing(false);
  };

  return (
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
                : "text-[color:var(--foreground)]/60 hover:bg-[#25254D] hover:text-white",
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
            <p className="mt-0.5 text-xs text-[color:var(--foreground)]/55">{activeMeta.description}</p>
          </div>

          <ScrollArea className="h-[580px]">
            <div>
              {paginatedData.length === 0 ? (
                <div className="px-4 py-12 text-center text-xs text-[color:var(--foreground)]/45">
                  Aucun resultat.
                </div>
              ) : (
                paginatedData.map((item) => (
                  <ListItem
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
          <div className="flex items-center justify-between border-t border-[#141433] px-4 py-2.5 text-xs text-[color:var(--foreground)]/50">
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
                <p className="mt-1 text-xs text-[color:var(--foreground)]/50">
                  Choisis un element dans la liste.
                </p>
              </div>
            </div>
          ) : (
            <DetailPanel
              key={`${contentType}-${(selectedItem as { id: number }).id}`}
              item={selectedItem}
              contentType={contentType}
              topicTitleById={topicTitleById}
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onCancelEdit={() => setIsEditing(false)}
              onSave={actionSet.update}
              onDelete={() => void handleDelete((selectedItem as { id: number }).id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ListItem({
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
      <p className="mt-0.5 text-[11px] text-[color:var(--foreground)]/45">
        #{itemId} - {author}
        {date ? ` - ${formatDateTime(date)}` : ""}
      </p>
      <StatusBadges item={item} contentType={contentType} />
    </button>
  );
}

function DetailPanel({
  item,
  contentType,
  topicTitleById,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  item: ContentItem;
  contentType: ContentType;
  topicTitleById: Record<number, string>;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: ServerActionFn;
  onDelete: () => void;
}) {
  const [formState, setFormState] = useState<Record<string, string | boolean>>({});
  const itemId = (item as { id: number }).id;
  const title = getItemTitle(item, contentType, topicTitleById) || "(sans titre)";
  const author = (item as { autor?: string | null }).autor || "Inconnu";
  const date = resolveItemDate(item);

  const startEdit = () => {
    const initial: Record<string, string | boolean> = {};

    if (contentType === "topics") {
      const topic = item as AdminTopic;
      initial.titulo = topic.titulo || "";
      initial.conteudo = topic.conteudo || "";
      initial.imagem = topic.imagem || "";
      initial.fixo = !!topic.fixo;
      initial.fechado = !!topic.fechado;
    } else if (contentType === "articles") {
      const article = item as AdminArticle;
      initial.titulo = article.titulo || "";
      initial.descricao = article.descricao || "";
      initial.imagem = article.imagem || "";
      initial.noticia = article.noticia || "";
    } else if (contentType === "posts") {
      initial.conteudo = (item as AdminPost).conteudo || "";
    } else if (contentType === "forumComments") {
      initial.comentario = (item as AdminForumComment).comentario || "";
    } else if (contentType === "newsComments") {
      initial.comentario = (item as AdminNewsComment).comentario || "";
    } else if (contentType === "stories") {
      const story = item as AdminStory;
      initial.titulo = story.titulo || "";
      initial.imagem = (story as any).image || (story as any).imagem || "";
      initial.status = story.status || "public";
    }

    setFormState(initial);
    onEdit();
  };

  const handleSave = async () => {
    const formData = new FormData();
    formData.set("id", String(itemId));

    Object.entries(formState).forEach(([key, value]) => {
      if (typeof value === "boolean") {
        if (value) formData.set(key, "on");
      } else {
        formData.set(key, value);
      }
    });

    await onSave(formData);
    onCancelEdit();
  };

  return (
    <div className="flex h-full min-h-[640px] flex-col">
      {/* Header */}
      <div className="border-b border-[#141433] px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-[#25254D] text-xs text-[color:var(--foreground)]/70">
                {CONTENT_SECTIONS[contentType].label}
              </Badge>
              <StatusBadges item={item} contentType={contentType} />
            </div>
            <h3 className="mt-2 text-lg font-bold text-white">{title}</h3>
            <p className="mt-0.5 text-xs text-[color:var(--foreground)]/50">
              #{itemId} - {author}
              {date ? ` - ${formatDateTime(date)}` : ""}
            </p>
          </div>

          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  type="button"
                  onClick={startEdit}
                  className="h-[36px] rounded-[4px] bg-[#2596FF] text-xs font-bold uppercase text-white hover:bg-[#2976E8]"
                >
                  <Pencil className="mr-1.5 h-3 w-3" />
                  Modifier
                </Button>
                <Button
                  type="button"
                  onClick={onDelete}
                  className="h-[36px] rounded-[4px] bg-red-500 text-xs font-bold uppercase text-white hover:bg-red-600"
                >
                  <Trash2 className="mr-1.5 h-3 w-3" />
                  Supprimer
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  onClick={onCancelEdit}
                  className="h-[36px] rounded-[4px] border border-[#141433] bg-[#25254D] text-xs font-bold uppercase text-white hover:bg-[#303060]"
                >
                  <X className="mr-1.5 h-3 w-3" />
                  Annuler
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSave()}
                  className="h-[36px] rounded-[4px] bg-[#0FD52F] text-xs font-bold uppercase text-white hover:bg-green-600"
                >
                  <Save className="mr-1.5 h-3 w-3" />
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-5">
          {!isEditing ? (
            <ViewContent item={item} contentType={contentType} topicTitleById={topicTitleById} />
          ) : (
            <EditForm contentType={contentType} formState={formState} setFormState={setFormState} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ViewContent({
  item,
  contentType,
  topicTitleById,
}: {
  item: ContentItem;
  contentType: ContentType;
  topicTitleById: Record<number, string>;
}) {
  const imageId =
    contentType === "stories"
      ? (item as AdminStory).image || (item as AdminStory).imagem
      : contentType === "topics"
        ? (item as AdminTopic).imagem
        : contentType === "articles"
          ? (item as AdminArticle).imagem
          : null;

  const imageUrl = resolveAssetUrl(imageId);
  const bodyHtml =
    contentType === "topics"
      ? (item as AdminTopic).conteudo
      : contentType === "articles"
        ? (item as AdminArticle).noticia
        : contentType === "posts"
          ? (item as AdminPost).conteudo
          : contentType === "forumComments"
            ? (item as AdminForumComment).comentario
            : contentType === "newsComments"
              ? (item as AdminNewsComment).comentario
              : null;

  const metaCards: Array<{ label: string; value: string }> = [];

  if (contentType === "posts") {
    metaCards.push({
      label: "Sujet lie",
      value: topicTitleById[(item as AdminPost).id_topico ?? 0] || `Sujet #${(item as AdminPost).id_topico}`,
    });
  }
  if (contentType === "forumComments") {
    metaCards.push({ label: "Sujet", value: `#${(item as AdminForumComment).id_forum}` });
  }
  if (contentType === "newsComments") {
    metaCards.push({ label: "Article", value: `#${(item as AdminNewsComment).id_noticia}` });
  }
  if (contentType === "articles" && (item as AdminArticle).descricao) {
    metaCards.push({ label: "Resume", value: (item as AdminArticle).descricao || "" });
  }
  if (contentType === "stories") {
    metaCards.push({ label: "Statut", value: (item as AdminStory).status || "public" });
  }
  if (contentType === "topics") {
    metaCards.push({ label: "Epingle", value: (item as AdminTopic).fixo ? "Oui" : "Non" });
    metaCards.push({ label: "Ferme", value: (item as AdminTopic).fechado ? "Oui" : "Non" });
  }

  return (
    <div className="space-y-4">
      {metaCards.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {metaCards.map((entry) => (
            <div
              key={`${entry.label}-${entry.value}`}
              className="rounded-[4px] border border-[#141433] bg-[#25254D] px-3 py-2.5"
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--foreground)]/45">{entry.label}</p>
              <p className="mt-1 text-sm text-[color:var(--foreground)]/75">{entry.value}</p>
            </div>
          ))}
        </div>
      )}

      {imageUrl && (
        <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-3">
          <p className="text-xs font-bold uppercase text-white">Media</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Apercu"
            className="mt-2 max-h-[300px] w-full rounded-[4px] bg-black/20 object-contain"
          />
        </div>
      )}

      {bodyHtml && (
        <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-3">
          <p className="text-xs font-bold uppercase text-white">Contenu</p>
          <div
            className="prose prose-sm prose-invert mt-2 max-w-none rounded-[4px] border border-[#141433] bg-[#1F1F3E] p-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml || "<em>Aucun contenu</em>" }}
          />
        </div>
      )}
    </div>
  );
}

function EditForm({
  contentType,
  formState,
  setFormState,
}: {
  contentType: ContentType;
  formState: Record<string, string | boolean>;
  setFormState: Dispatch<SetStateAction<Record<string, string | boolean>>>;
}) {
  const updateField = (key: string, value: string | boolean) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  const ct = contentType as string;
  const hasTitle = ct === "topics" || ct === "articles" || ct === "stories";
  const hasImage = ct === "topics" || ct === "articles" || ct === "stories";
  const hasEditor = ct !== "stories";

  return (
    <div className="space-y-4">
      {/* Section: Informations */}
      {hasTitle && (
        <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#2596FF]">Informations</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {hasTitle && (
              <Field label="Titre">
                <Input
                  value={(formState.titulo as string) || ""}
                  onChange={(event) => updateField("titulo", event.target.value)}
                  placeholder="Titre du contenu..."
                  className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white placeholder:text-[#BEBECE]/30"
                />
              </Field>
            )}

            {contentType === "articles" && (
              <Field label="Resume">
                <Input
                  value={(formState.descricao as string) || ""}
                  onChange={(event) => updateField("descricao", event.target.value)}
                  placeholder="Bref resume..."
                  className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white placeholder:text-[#BEBECE]/30"
                />
              </Field>
            )}

            {contentType === "stories" && (
              <Field label="Statut">
                <select
                  className="flex h-[40px] w-full rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 text-sm text-white outline-none"
                  value={(formState.status as string) || "public"}
                  onChange={(event) => updateField("status", event.target.value)}
                >
                  <option value="public" className="bg-[#141433]">Public</option>
                  <option value="hidden" className="bg-[#141433]">Cache</option>
                  <option value="draft" className="bg-[#141433]">Brouillon</option>
                </select>
              </Field>
            )}
          </div>

          {contentType === "topics" && (
            <div className="mt-4 flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/75">
                <Checkbox checked={!!formState.fixo} onCheckedChange={(value) => updateField("fixo", !!value)} />
                Epingle
              </label>
              <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/75">
                <Checkbox checked={!!formState.fechado} onCheckedChange={(value) => updateField("fechado", !!value)} />
                Ferme
              </label>
            </div>
          )}
        </div>
      )}

      {/* Section: Media */}
      {hasImage && (
        <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#2596FF]">Media</p>
          <ImageField
            value={(formState.imagem as string) || ""}
            onChange={(v) => updateField("imagem", v)}
          />
        </div>
      )}

      {/* Section: Contenu */}
      {hasEditor && (
        <div className="rounded-[4px] border border-[#141433] bg-[#25254D] p-4">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#2596FF]">Contenu</p>
          <AdminRichEditor
            value={
              contentType === "articles"
                ? ((formState.noticia as string) || "")
                : contentType === "forumComments" || contentType === "newsComments"
                  ? ((formState.comentario as string) || "")
                  : ((formState.conteudo as string) || "")
            }
            onChange={(html) => {
              const fieldName =
                contentType === "articles"
                  ? "noticia"
                  : contentType === "forumComments" || contentType === "newsComments"
                    ? "comentario"
                    : "conteudo";
              updateField(fieldName, html);
            }}
          />
        </div>
      )}
    </div>
  );
}

function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const previewUrl = resolveAssetUrl(value);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/upload/image", { method: "POST", body: fd });
      const data = await res.json();
      if (data?.ok && data?.id) {
        onChange(data.id);
        setShowUrl(false);
        toast.success("Image uploadee");
      } else {
        toast.error(data?.error || "Erreur upload");
      }
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="relative overflow-hidden rounded-[4px] border border-[#141433] bg-[#1F1F3E]">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Preview"
            className="max-h-[200px] w-full object-contain p-2"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="flex h-[120px] items-center justify-center">
            <div className="text-center">
              <ImagePlus className="mx-auto h-8 w-8 text-[color:var(--foreground)]/20" />
              <p className="mt-1 text-[11px] text-[color:var(--foreground)]/30">Aucune image</p>
            </div>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-[#2596FF]" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#303060] disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Upload..." : "Uploader"}
        </button>
        <button
          type="button"
          onClick={() => setShowUrl(!showUrl)}
          className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#303060]"
        >
          <Link2 className="h-3.5 w-3.5" />
          Coller URL
        </button>
        {value && (
          <button
            type="button"
            onClick={() => { onChange(""); setShowUrl(false); }}
            className="inline-flex items-center gap-1.5 rounded-[4px] border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-bold text-red-400 transition hover:bg-red-500/20"
          >
            <X className="h-3.5 w-3.5" />
            Supprimer
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) { e.target.value = ""; void handleUpload(file); }
        }}
      />

      {/* URL input (toggle) */}
      {showUrl && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="UUID Directus ou URL de l'image..."
          className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white placeholder:text-[#BEBECE]/30"
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[color:var(--foreground)]/50">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadges({ item, contentType }: { item: ContentItem; contentType: ContentType }) {
  if (contentType === "topics") {
    return (
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {(item as AdminTopic).fixo && (
          <Badge className="border-0 bg-[#FFC800]/15 text-[10px] text-[#FFC800]">Epingle</Badge>
        )}
        {(item as AdminTopic).fechado && (
          <Badge className="border-0 bg-[#25254D] text-[10px] text-[color:var(--foreground)]/60">Ferme</Badge>
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
              : "bg-[#25254D] text-[color:var(--foreground)]/60",
          )}
        >
          {status}
        </Badge>
      </div>
    );
  }

  return null;
}

function getItemTitle(item: ContentItem, contentType: ContentType, topicTitleById: Record<number, string>) {
  if (contentType === "topics") return (item as AdminTopic).titulo || "(sans titre)";
  if (contentType === "articles") return (item as AdminArticle).titulo || "(sans titre)";
  if (contentType === "posts") {
    return topicTitleById[(item as AdminPost).id_topico ?? 0] || `Sujet #${(item as AdminPost).id_topico}`;
  }
  if (contentType === "forumComments") return `Com. sujet #${(item as AdminForumComment).id_forum}`;
  if (contentType === "newsComments") return `Com. article #${(item as AdminNewsComment).id_noticia}`;
  return (item as AdminStory).titulo || `Story #${(item as AdminStory).id}`;
}

function resolveItemDate(item: ContentItem) {
  return (
    (item as { data?: string | null }).data ||
    (item as { date_created?: string | null }).date_created ||
    (((item as { dta?: number | null }).dta ?? 0) > 0
      ? new Date(((item as { dta?: number | null }).dta ?? 0) * 1000).toISOString()
      : undefined)
  );
}

function resolveAssetUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return `${DIRECTUS_BASE_URL}/assets/${value}`;
}
