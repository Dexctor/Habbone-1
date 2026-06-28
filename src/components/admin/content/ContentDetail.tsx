"use client";

import dynamic from "next/dynamic";
import {
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useRef,
  useState,
} from "react";
import { Eye, ImagePlus, Info, Link2, Loader2, Pencil, Save, Trash2, Upload, X } from "lucide-react";
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
} from "@/server/pocketbase/types";
import { StatusBadges } from "./ContentList";
import {
  CONTENT_SECTIONS,
  type ContentItem,
  type ContentType,
  type ServerActionFn,
  getItemTitle,
  resolveAssetUrl,
  resolveItemDate,
} from "./content-helpers";

const AdminRichEditor = dynamic(() => import("@/components/admin/AdminRichEditor"), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-[4px] bg-[#25254D]" />,
});

/* ------------------------------------------------------------------ */
/*  Detail panel                                                       */
/* ------------------------------------------------------------------ */

export function ContentDetailPanel({
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
  const [detailTab, setDetailTab] = useState<"preview" | "metadata">("preview");
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
      initial.imagem =
        (story as unknown as { image?: string }).image ||
        (story as unknown as { imagem?: string }).imagem ||
        "";
      initial.status = story.status || "public";
    }

    setFormState(initial);
    setDetailTab("preview");
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
            <p className="mt-0.5 text-xs text-admin-text-tertiary">
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
            <div className="space-y-4">
              <div className="inline-flex rounded-[5px] border border-[#141433] bg-[#25254D] p-1">
                <TabButton
                  active={detailTab === "preview"}
                  icon={<Eye className="h-3.5 w-3.5" />}
                  onClick={() => setDetailTab("preview")}
                >
                  Aperçu
                </TabButton>
                <TabButton
                  active={detailTab === "metadata"}
                  icon={<Info className="h-3.5 w-3.5" />}
                  onClick={() => setDetailTab("metadata")}
                >
                  Métadonnées
                </TabButton>
              </div>
              <ViewContent
                item={item}
                contentType={contentType}
                topicTitleById={topicTitleById}
                activeTab={detailTab}
              />
            </div>
          ) : (
            <EditForm contentType={contentType} formState={formState} setFormState={setFormState} />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function TabButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-[4px] px-3 text-[11px] font-bold transition-colors",
        active ? "bg-[#2596FF] text-white" : "text-admin-text-tertiary hover:bg-white/[0.04] hover:text-white",
      )}
      aria-pressed={active}
    >
      {icon}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  View mode                                                          */
/* ------------------------------------------------------------------ */

function ViewContent({
  item,
  contentType,
  topicTitleById,
  activeTab,
}: {
  item: ContentItem;
  contentType: ContentType;
  topicTitleById: Record<number, string>;
  activeTab: "preview" | "metadata";
}) {
  const itemId = (item as { id: number }).id;
  const author = (item as { autor?: string | null }).autor || "Inconnu";
  const date = resolveItemDate(item);
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
  metaCards.push({ label: "ID", value: `#${itemId}` });
  metaCards.push({ label: "Type", value: CONTENT_SECTIONS[contentType].label });
  metaCards.push({ label: "Auteur", value: author });
  if (date) metaCards.push({ label: "Date", value: formatDateTime(date) });

  if (contentType === "posts") {
    metaCards.push({
      label: "Sujet lié",
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
    metaCards.push({ label: "Résumé", value: (item as AdminArticle).descricao || "" });
  }
  if (contentType === "stories") {
    metaCards.push({ label: "Statut", value: (item as AdminStory).status || "public" });
  }
  if (contentType === "topics") {
    metaCards.push({ label: "Épinglé", value: (item as AdminTopic).fixo ? "Oui" : "Non" });
    metaCards.push({ label: "Fermé", value: (item as AdminTopic).fechado ? "Oui" : "Non" });
  }

  if (activeTab === "metadata") {
    return (
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {metaCards.map((entry) => (
          <div
            key={`${entry.label}-${entry.value}`}
            className="rounded-[5px] border border-[#141433] bg-[#25254D] px-3 py-2.5"
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">{entry.label}</p>
            <p className="mt-1 break-words text-sm text-[color:var(--foreground)]/80">{entry.value}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="overflow-hidden rounded-[5px] border border-[#141433] bg-[#25254D]">
          <div className="border-b border-[#141433] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">Média</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Aperçu"
            className="max-h-[320px] w-full bg-black/20 object-contain p-3"
          />
        </div>
      )}

      {bodyHtml && (
        <div className="overflow-hidden rounded-[5px] border border-[#141433] bg-[#25254D]">
          <div className="border-b border-[#141433] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">Contenu</p>
          </div>
          <div
            className="prose prose-sm prose-invert max-w-none bg-[#1F1F3E] p-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml || "<em>Aucun contenu</em>" }}
          />
        </div>
      )}

      {!imageUrl && !bodyHtml && (
        <div className="flex min-h-[220px] items-center justify-center rounded-[5px] border border-[#141433] bg-[#25254D] px-6 py-10 text-center">
          <p className="text-sm text-admin-text-tertiary">Aucun aperçu disponible pour ce contenu.</p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edit form                                                          */
/* ------------------------------------------------------------------ */

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
    <div className="overflow-hidden rounded-[6px] border border-[#141433] bg-[#25254D]">
      <div className="border-b border-[#141433] px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-admin-brand-blue">Édition</p>
      </div>

      <div className="space-y-5 p-4">
        {hasTitle && (
          <section className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">Informations</p>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Titre">
                <Input
                  value={(formState.titulo as string) || ""}
                  onChange={(event) => updateField("titulo", event.target.value)}
                  placeholder="Titre du contenu..."
                  className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white placeholder:text-[#BEBECE]/30"
                />
              </Field>

              {contentType === "articles" && (
                <Field label="Résumé">
                  <Input
                    value={(formState.descricao as string) || ""}
                    onChange={(event) => updateField("descricao", event.target.value)}
                    placeholder="Bref résumé..."
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
                    <option value="hidden" className="bg-[#141433]">Caché</option>
                    <option value="draft" className="bg-[#141433]">Brouillon</option>
                  </select>
                </Field>
              )}
            </div>

            {contentType === "topics" && (
              <div className="flex flex-wrap gap-6 border-t border-[#141433] pt-3">
                <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/75">
                  <Checkbox checked={!!formState.fixo} onCheckedChange={(value) => updateField("fixo", !!value)} />
                  Épinglé
                </label>
                <label className="flex items-center gap-2 text-sm text-[color:var(--foreground)]/75">
                  <Checkbox checked={!!formState.fechado} onCheckedChange={(value) => updateField("fechado", !!value)} />
                  Fermé
                </label>
              </div>
            )}
          </section>
        )}

        {hasImage && (
          <section className="space-y-3 border-t border-[#141433] pt-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">Média</p>
            <ImageField value={(formState.imagem as string) || ""} onChange={(v) => updateField("imagem", v)} />
          </section>
        )}

        {hasEditor && (
          <section className={cn("space-y-3", (hasTitle || hasImage) && "border-t border-[#141433] pt-5")}>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">Contenu</p>
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
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Image field + file upload                                          */
/* ------------------------------------------------------------------ */

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
        toast.success("Image téléversée");
      } else {
        toast.error(data?.error || "Erreur lors du téléversement");
      }
    } catch {
      toast.error("Erreur réseau");
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
            alt="Aperçu"
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
            <Loader2 className="h-6 w-6 animate-spin text-admin-brand-blue" />
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
          {uploading ? "Téléversement…" : "Téléverser"}
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
          placeholder="URL de l'image..."
          className="h-[40px] rounded-[4px] border-[#141433] bg-[#1F1F3E] text-white placeholder:text-[#BEBECE]/30"
        />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[10px] font-bold uppercase tracking-[0.1em] text-admin-text-tertiary">{label}</Label>
      {children}
    </div>
  );
}
