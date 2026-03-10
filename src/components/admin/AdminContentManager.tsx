"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useState } from "react";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  ImageIcon,
  MessageCircle,
  MessagesSquare,
  Newspaper,
  Pencil,
  Pin,
  Save,
  Trash2,
  X,
} from "lucide-react";
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
  loading: () => <div className="h-32 animate-pulse rounded-[20px] bg-white/5" />,
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

const CONTENT_SECTIONS: Record<
  ContentType,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
  }
> = {
  topics: { label: "Sujets forum", description: "Epingle, ferme ou edite les topics.", icon: MessagesSquare, accent: "text-[#7bc3ff]" },
  posts: { label: "Messages forum", description: "Controle les reponses liees aux sujets.", icon: MessageCircle, accent: "text-[#67d88b]" },
  articles: { label: "Articles", description: "Travaille les titres, resumes et contenus news.", icon: Newspaper, accent: "text-[#ffd772]" },
  forumComments: { label: "Commentaires forum", description: "Moderation rapide des commentaires forum.", icon: FileText, accent: "text-[#ff9db1]" },
  newsComments: { label: "Commentaires news", description: "Gestion des reactions liees aux articles.", icon: FileText, accent: "text-[#f6b4ff]" },
  stories: { label: "Stories", description: "Titre, media et statut des stories.", icon: Camera, accent: "text-[#a6f6ff]" },
};

export default function AdminContentManager(props: AdminContentManagerProps) {
  const { topics, posts, news, forumComments, newsComments, stories, topicTitleById } = props;

  const [contentType, setContentType] = useState<ContentType>("topics");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const searchLower = search.trim().toLowerCase();

  const handleTypeChange = useCallback((type: ContentType) => {
    setContentType(type);
    setPage(1);
    setSelectedId(null);
    setIsEditing(false);
  }, []);

  const filteredData = useMemo(() => {
    const filterFn = (searchable: string) => !searchLower || searchable.toLowerCase().includes(searchLower);

    switch (contentType) {
      case "topics":
        return topics.filter((topic) => filterFn(`${topic.titulo ?? ""} ${topic.autor ?? ""}`));
      case "posts":
        return posts.filter((post) => filterFn(`${post.autor ?? ""} ${topicTitleById[post.id_topico ?? 0] ?? ""}`));
      case "articles":
        return news.filter((article) => filterFn(`${article.titulo ?? ""} ${article.autor ?? ""}`));
      case "forumComments":
        return forumComments.filter((comment) => filterFn(`${comment.autor ?? ""} ${comment.id_forum ?? ""}`));
      case "newsComments":
        return newsComments.filter((comment) => filterFn(`${comment.autor ?? ""} ${comment.id_noticia ?? ""}`));
      case "stories":
        return stories.filter((story) => filterFn(`${story.titulo ?? ""} ${story.autor ?? ""}`));
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

  const getActions = useCallback(() => {
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
    await getActions().remove(formData);
    setSelectedId(null);
    setIsEditing(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(CONTENT_SECTIONS) as ContentType[]).map((type) => {
            const active = contentType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeChange(type)}
                className={`rounded-[14px] px-4 py-2 text-sm transition ${active ? "bg-[#2596ff] text-white" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}
              >
                {CONTENT_SECTIONS[type].label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            id="admin-content-search"
            placeholder="Rechercher"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="h-11 w-full rounded-2xl border-white/10 bg-black/20 text-white placeholder:text-white/35 sm:w-72"
          />
          <Badge className="border-0 bg-white/8 px-3 py-2 text-white/72">{filteredData.length} element(s)</Badge>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <section className="overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">{activeMeta.label}</p>
              <p className="mt-1 text-xs text-white/45">Page {safePage}/{totalPages}</p>
            </div>
            <Badge className="border-0 bg-white/8 text-white/72">{filteredData.length}</Badge>
          </div>

          <ScrollArea className="h-[560px] xl:h-[660px]">
            <div className="space-y-2 p-3">
              {paginatedData.length === 0 ? (
                <div className="rounded-[18px] border border-dashed border-white/10 bg-white/[0.03] px-4 py-10 text-center text-sm text-white/50">
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

          <div className="flex items-center justify-between gap-3 border-t border-white/8 px-4 py-3 text-xs text-white/50">
            <span>{filteredData.length} resultat(s)</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-white/70 hover:bg-white/8 hover:text-white"
                disabled={safePage <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-16 text-center text-white/70">{safePage}/{totalPages}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-white/70 hover:bg-white/8 hover:text-white"
                disabled={safePage >= totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </section>

        <section className="min-h-[720px] overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.03]">
        {!selectedItem ? (
          <div className="flex h-full min-h-[720px] items-center justify-center px-6 py-10">
            <div className="max-w-md text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-[#ffd722]">
                <Eye className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold text-white">Selectionne un contenu</h3>
              <p className="mt-3 text-sm leading-6 text-white/58">
                Choisis un element dans la liste a gauche pour le consulter ou l'editer.
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
            onSave={getActions().update}
            onDelete={() => handleDelete((selectedItem as { id: number }).id)}
          />
        )}
        </section>
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
  const meta = CONTENT_SECTIONS[contentType];
  const ItemIcon = meta.icon;
  const itemId = (item as { id: number }).id;

  const title =
    contentType === "topics"
      ? (item as AdminTopic).titulo || "(sans titre)"
      : contentType === "articles"
        ? (item as AdminArticle).titulo || "(sans titre)"
        : contentType === "posts"
          ? topicTitleById[(item as AdminPost).id_topico ?? 0] || `Sujet #${(item as AdminPost).id_topico}`
          : contentType === "forumComments"
            ? `Commentaire sur sujet #${(item as AdminForumComment).id_forum}`
            : contentType === "newsComments"
              ? `Commentaire sur article #${(item as AdminNewsComment).id_noticia}`
              : (item as AdminStory).titulo || `Story #${(item as AdminStory).id}`;

  const summary =
    contentType === "topics"
      ? stripHtml((item as AdminTopic).conteudo)
      : contentType === "articles"
        ? (item as AdminArticle).descricao || stripHtml((item as AdminArticle).noticia)
        : contentType === "posts"
          ? stripHtml((item as AdminPost).conteudo)
          : contentType === "forumComments"
            ? stripHtml((item as AdminForumComment).comentario)
            : contentType === "newsComments"
              ? stripHtml((item as AdminNewsComment).comentario)
              : (item as AdminStory).status || "Story";

  const author = (item as { autor?: string | null }).autor || "Auteur inconnu";
  const date =
    (item as { data?: string | null }).data ||
    (item as { date_created?: string | null }).date_created ||
    (((item as { dta?: number | null }).dta ?? 0) > 0
      ? new Date(((item as { dta?: number | null }).dta ?? 0) * 1000).toISOString()
      : undefined);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-[22px] border px-4 py-4 text-left transition",
        isSelected
          ? "border-[#2596ff]/35 bg-[#2596ff]/10 text-white shadow-[0_24px_60px_-48px_rgba(37,150,255,0.9)]"
          : "border-white/8 bg-white/[0.03] text-white/76 hover:border-white/14 hover:bg-white/[0.05]",
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
            isSelected ? "border-[#2596ff]/30 bg-[#2596ff]/16" : "border-white/10 bg-black/10",
          )}
        >
          <ItemIcon className={cn("h-4 w-4", isSelected ? "text-[#7bc3ff]" : meta.accent)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-medium text-white">{title}</p>
              <p className="mt-1 text-xs text-white/45">
                #{itemId} · {author}
                {date ? ` · ${formatDateTime(date)}` : ""}
              </p>
            </div>
            <StatusBadges item={item} contentType={contentType} />
          </div>
          <p className="mt-3 line-clamp-2 text-sm leading-5 text-white/56">{summary || "Aucun extrait disponible."}</p>
        </div>
      </div>
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

  const title =
    contentType === "topics"
      ? (item as AdminTopic).titulo
      : contentType === "articles"
        ? (item as AdminArticle).titulo
        : contentType === "posts"
          ? topicTitleById[(item as AdminPost).id_topico ?? 0]
          : contentType === "forumComments"
            ? `Commentaire forum #${itemId}`
            : contentType === "newsComments"
              ? `Commentaire article #${itemId}`
              : (item as AdminStory).titulo || `Story #${itemId}`;

  const author = (item as { autor?: string | null }).autor || "Auteur inconnu";
  const date =
    (item as { data?: string | null }).data ||
    (item as { date_created?: string | null }).date_created ||
    (((item as { dta?: number | null }).dta ?? 0) > 0
      ? new Date(((item as { dta?: number | null }).dta ?? 0) * 1000).toISOString()
      : undefined);

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
    <div className="flex h-full min-h-[720px] flex-col">
      <div className="border-b border-white/8 px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-white/8 text-white/72">{CONTENT_SECTIONS[contentType].label}</Badge>
              <StatusBadges item={item} contentType={contentType} />
            </div>
            <div>
              <h3 className="text-2xl font-semibold text-white">{title || "(sans titre)"}</h3>
              <p className="mt-2 text-sm text-white/52">
                #{itemId} · {author}
                {date ? ` · ${formatDateTime(date)}` : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startEdit}
                  className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Modifier
                </Button>
                <Button type="button" variant="destructive" size="sm" onClick={onDelete} className="rounded-full">
                  <Trash2 className="mr-1 h-4 w-4" />
                  Supprimer
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onCancelEdit}
                  className="rounded-full text-white/70 hover:bg-white/8 hover:text-white"
                >
                  <X className="mr-1 h-4 w-4" />
                  Annuler
                </Button>
                <Button type="button" size="sm" onClick={handleSave} className="rounded-full bg-[#2596ff] text-white hover:bg-[#1e84e0]">
                  <Save className="mr-1 h-4 w-4" />
                  Enregistrer
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 sm:p-6">
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
    <div className="space-y-5">
      {metaCards.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {metaCards.map((entry) => (
            <div key={`${entry.label}-${entry.value}`} className="rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">{entry.label}</p>
              <p className="mt-2 text-sm leading-6 text-white/78">{entry.value}</p>
            </div>
          ))}
        </div>
      ) : null}

      {imageUrl ? (
        <section className="rounded-[26px] border border-white/10 bg-black/20 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <ImageIcon className="h-4 w-4 text-[#ffd772]" />
            Apercu media
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="Apercu contenu admin" className="max-h-[360px] w-full rounded-[18px] object-contain bg-black/20" />
          <p className="mt-3 break-all text-xs text-white/42">{imageId}</p>
        </section>
      ) : null}

      {bodyHtml ? (
        <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <Eye className="h-4 w-4 text-[#7bc3ff]" />
            Contenu
          </div>
          <div
            className="prose prose-sm prose-invert max-w-none rounded-[18px] border border-white/6 bg-black/20 p-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml || "<em>Aucun contenu</em>" }}
          />
        </section>
      ) : null}
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
  setFormState: React.Dispatch<React.SetStateAction<Record<string, string | boolean>>>;
}) {
  const updateField = (key: string, value: string | boolean) => {
    setFormState((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-4 lg:grid-cols-2">
          {(contentType === "topics" || contentType === "articles" || contentType === "stories") && (
            <Field label="Titre">
              <Input
                value={(formState.titulo as string) || ""}
                onChange={(event) => updateField("titulo", event.target.value)}
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />
            </Field>
          )}

          {contentType === "articles" && (
            <Field label="Resume">
              <Input
                value={(formState.descricao as string) || ""}
                onChange={(event) => updateField("descricao", event.target.value)}
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />
            </Field>
          )}

          {(contentType === "topics" || contentType === "articles") && (
            <Field label="Image UUID / URL">
              <Input
                value={(formState.imagem as string) || ""}
                onChange={(event) => updateField("imagem", event.target.value)}
                className="h-11 rounded-2xl border-white/10 bg-black/20 text-white"
              />
            </Field>
          )}

          {contentType === "stories" && (
            <Field label="Statut">
              <select
                className="flex h-11 w-full rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none"
                value={(formState.status as string) || "public"}
                onChange={(event) => updateField("status", event.target.value)}
              >
                <option value="public" className="bg-[#141433]">
                  Public
                </option>
                <option value="hidden" className="bg-[#141433]">
                  Cache
                </option>
                <option value="draft" className="bg-[#141433]">
                  Brouillon
                </option>
              </select>
            </Field>
          )}
        </div>

        {contentType === "topics" ? (
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-3 text-sm text-white/78">
              <Checkbox checked={!!formState.fixo} onCheckedChange={(value) => updateField("fixo", !!value)} />
              Epingle
            </label>
            <label className="flex items-center gap-3 text-sm text-white/78">
              <Checkbox checked={!!formState.fechado} onCheckedChange={(value) => updateField("fechado", !!value)} />
              Ferme
            </label>
          </div>
        ) : null}
      </section>

      {contentType !== "stories" ? (
        <section className="rounded-[26px] border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <Pencil className="h-4 w-4 text-[#7bc3ff]" />
            Edition du contenu
          </div>
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
        </section>
      ) : null}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</Label>
      {children}
    </div>
  );
}

function StatusBadges({ item, contentType }: { item: ContentItem; contentType: ContentType }) {
  if (contentType === "topics") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {(item as AdminTopic).fixo ? (
          <Badge className="border-0 bg-[#ffd722]/14 text-[#ffd772]">
            <Pin className="mr-1 h-3 w-3" />
            Epingle
          </Badge>
        ) : null}
        {(item as AdminTopic).fechado ? <Badge className="border-0 bg-white/10 text-white/72">Ferme</Badge> : null}
      </div>
    );
  }

  if (contentType === "stories") {
    const status = (item as AdminStory).status || "public";
    return (
      <Badge className={cn("border-0", status === "public" ? "bg-[#67d88b]/15 text-[#67d88b]" : "bg-white/10 text-white/72")}>
        {status}
      </Badge>
    );
  }

  return null;
}

function stripHtml(value?: string | null) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveAssetUrl(value?: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return `${DIRECTUS_BASE_URL}/assets/${value}`;
}
