"use client";

import { useState, useMemo, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with TipTap
const AdminRichEditor = dynamic(() => import("@/components/admin/AdminRichEditor"), {
    ssr: false,
    loading: () => <div className="h-32 bg-[color:var(--bg-700)] rounded animate-pulse" />,
});
import { formatDateTime } from "@/lib/date-utils";
import { Pencil, Trash2, X, Save, ChevronLeft, ChevronRight } from "lucide-react";
import type {
    ForumTopicRecord as AdminTopic,
    ForumPostRecord as AdminPost,
    NewsRecord as AdminArticle,
    ForumCommentRecord as AdminForumComment,
    NewsCommentRecord as AdminNewsComment,
    StoryRecord as AdminStory,
} from "@/server/directus/types";

type ServerActionFn = (formData: FormData) => Promise<void>;

const PAGE_SIZE = 20;

// Union type for all content items
type ContentItem = AdminTopic | AdminPost | AdminArticle | AdminForumComment | AdminNewsComment | AdminStory;

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

type ContentType = "topics" | "posts" | "articles" | "forumComments" | "newsComments" | "stories";

export default function AdminContentManager(props: AdminContentManagerProps) {
    const { topics, posts, news, forumComments, newsComments, stories, topicTitleById } = props;

    const [contentType, setContentType] = useState<ContentType>("topics");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const searchLower = search.trim().toLowerCase();

    // Reset on type change
    const handleTypeChange = useCallback((type: ContentType) => {
        setContentType(type);
        setPage(1);
        setSelectedId(null);
        setIsEditing(false);
    }, []);

    // Filter data
    const filteredData = useMemo(() => {
        const filterFn = (searchable: string) => !searchLower || searchable.toLowerCase().includes(searchLower);

        switch (contentType) {
            case "topics":
                return topics.filter(t => filterFn(`${t.titulo ?? ""} ${t.autor ?? ""}`));
            case "posts":
                return posts.filter(p => filterFn(`${p.autor ?? ""} ${topicTitleById[p.id_topico ?? 0] ?? ""}`));
            case "articles":
                return news.filter(n => filterFn(`${n.titulo ?? ""} ${n.autor ?? ""}`));
            case "forumComments":
                return forumComments.filter(c => filterFn(`${c.autor ?? ""}`));
            case "newsComments":
                return newsComments.filter(c => filterFn(`${c.autor ?? ""}`));
            case "stories":
                return stories.filter(s => filterFn(`${s.titulo ?? ""} ${s.autor ?? ""}`));
            default:
                return [];
        }
    }, [contentType, topics, posts, news, forumComments, newsComments, stories, topicTitleById, searchLower]);

    const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginatedData = filteredData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    // Get selected item
    const selectedItem = useMemo(() => {
        if (!selectedId) return null;
        return filteredData.find((item) => (item as { id: number }).id === selectedId) || null;
    }, [selectedId, filteredData]);

    // Get update/delete functions for current type
    const getActions = useCallback(() => {
        switch (contentType) {
            case "topics": return { update: props.updateTopic, delete: props.deleteTopic };
            case "posts": return { update: props.updatePost, delete: props.deletePost };
            case "articles": return { update: props.updateArticle, delete: props.deleteArticle };
            case "forumComments": return { update: props.updateForumComment, delete: props.deleteForumComment };
            case "newsComments": return { update: props.updateNewsComment, delete: props.deleteNewsComment };
            case "stories": return { update: props.updateStory, delete: props.deleteStory };
        }
    }, [contentType, props]);

    // Handle item selection
    const handleSelect = (id: number) => {
        setSelectedId(id);
        setIsEditing(false);
    };

    // Handle delete
    const handleDelete = async (id: number) => {
        if (!confirm(`Supprimer l'élément #${id} ?`)) return;
        const formData = new FormData();
        formData.set("id", String(id));
        await getActions().delete(formData);
        setSelectedId(null);
    };

    return (
        <div className="flex flex-col h-[600px]">
            {/* Top bar with tabs and search */}
            <div className="flex items-center gap-4 pb-4 border-b border-[color:var(--bg-700)]/50">
                <Tabs value={contentType} onValueChange={(v) => handleTypeChange(v as ContentType)} className="flex-1">
                    <TabsList className="bg-[color:var(--bg-800)]/50 h-9">
                        <TabsTrigger value="topics" className="text-xs px-3">Sujets ({topics.length})</TabsTrigger>
                        <TabsTrigger value="posts" className="text-xs px-3">Messages ({posts.length})</TabsTrigger>
                        <TabsTrigger value="articles" className="text-xs px-3">Articles ({news.length})</TabsTrigger>
                        <TabsTrigger value="forumComments" className="text-xs px-3">Comm. Forum</TabsTrigger>
                        <TabsTrigger value="newsComments" className="text-xs px-3">Comm. News</TabsTrigger>
                        <TabsTrigger value="stories" className="text-xs px-3">Stories ({stories.length})</TabsTrigger>
                    </TabsList>
                </Tabs>
                <Input
                    placeholder="🔍 Rechercher..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="w-48 h-9 bg-[color:var(--bg-800)]/50"
                />
            </div>

            {/* Master-Detail split view */}
            <div className="flex flex-1 min-h-0 mt-4 gap-4">
                {/* Master: List (40%) */}
                <div className="w-2/5 flex flex-col border border-[color:var(--bg-700)]/50 rounded-lg overflow-hidden">
                    <ScrollArea className="flex-1">
                        <div className="divide-y divide-[color:var(--bg-700)]/30">
                            {paginatedData.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">Aucun résultat</div>
                            ) : (
                                paginatedData.map((item) => (
                                    <ListItem
                                        key={(item as { id: number }).id}
                                        item={item}
                                        contentType={contentType}
                                        topicTitleById={topicTitleById}
                                        isSelected={selectedId === (item as { id: number }).id}
                                        onSelect={() => handleSelect((item as { id: number }).id)}
                                    />
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-3 py-2 bg-[color:var(--bg-800)]/50 border-t border-[color:var(--bg-700)]/50 text-xs">
                        <span className="text-muted-foreground">{filteredData.length} éléments</span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={safePage <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span>{safePage}/{totalPages}</span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={safePage >= totalPages}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Detail: Edit panel (60%) */}
                <div className="w-3/5 border border-[color:var(--bg-700)]/50 rounded-lg overflow-hidden flex flex-col">
                    {!selectedItem ? (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <p className="text-lg mb-2">Sélectionnez un élément</p>
                                <p className="text-sm">Cliquez sur un élément à gauche pour le visualiser ou le modifier</p>
                            </div>
                        </div>
                    ) : (
                        <DetailPanel
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
                </div>
            </div>
        </div>
    );
}

// List item component
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
    const getTitle = () => {
        switch (contentType) {
            case "topics": return (item as AdminTopic).titulo || "(sans titre)";
            case "articles": return (item as AdminArticle).titulo || "(sans titre)";
            case "posts": return topicTitleById[(item as AdminPost).id_topico ?? 0] || `Sujet #${(item as AdminPost).id_topico}`;
            case "forumComments": return `Commentaire sur sujet #${(item as AdminForumComment).id_forum}`;
            case "newsComments": return `Commentaire sur article #${(item as AdminNewsComment).id_noticia}`;
            case "stories": return (item as AdminStory).titulo || `Story #${(item as AdminStory).id}`;
        }
    };

    const getAuthor = () => (item as { autor?: string }).autor || "—";
    const getDate = () => {
        const d = (item as { data?: string }).data;
        if (d) return d;
        // Stories: fallback to date_created or dta (unix seconds)
        if (contentType === "stories") {
            const story = item as AdminStory;
            if (story.date_created) return story.date_created;
            if (story.dta) return new Date(story.dta * 1000).toISOString();
        }
        return undefined;
    };
    const itemId = (item as { id: number }).id;

    return (
        <button
            onClick={onSelect}
            className={`w-full text-left p-3 transition-colors hover:bg-[color:var(--bg-700)]/30 ${isSelected ? "bg-[color:var(--bg-600)]/40 border-l-2 border-purple-500" : ""
                }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getTitle()}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>#{itemId}</span>
                        <span>•</span>
                        <span>{getAuthor()}</span>
                        {getDate() && (
                            <>
                                <span>•</span>
                                <span>{formatDateTime(getDate())}</span>
                            </>
                        )}
                    </div>
                </div>
                {contentType === "topics" && (
                    <div className="flex gap-1">
                        {(item as AdminTopic).fixo && <Badge variant="secondary" className="text-[10px]">📌</Badge>}
                        {(item as AdminTopic).fechado && <Badge variant="outline" className="text-[10px]">🔒</Badge>}
                    </div>
                )}
                {contentType === "stories" && (
                    <div className="flex gap-1">
                        <Badge variant={(item as AdminStory).status === 'public' ? "default" : "secondary"} className="text-[10px]">
                            {(item as AdminStory).status === 'public' ? 'Public' : (item as AdminStory).status || 'N/A'}
                        </Badge>
                    </div>
                )}
            </div>
        </button>
    );
}

// Detail panel component
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
    const itemId = (item as { id: number }).id;

    // Form state for editing
    const [formState, setFormState] = useState<Record<string, string | boolean>>({});

    // Initialize form state when editing starts
    const startEdit = () => {
        const initial: Record<string, string | boolean> = {};
        if (contentType === "topics") {
            const t = item as AdminTopic;
            initial.titulo = t.titulo || "";
            initial.conteudo = t.conteudo || "";
            initial.imagem = t.imagem || "";
            initial.fixo = !!t.fixo;
            initial.fechado = !!t.fechado;
        } else if (contentType === "articles") {
            const a = item as AdminArticle;
            initial.titulo = a.titulo || "";
            initial.descricao = a.descricao || "";
            initial.noticia = a.noticia || "";
            initial.imagem = a.imagem || "";
        } else if (contentType === "posts") {
            initial.conteudo = (item as AdminPost).conteudo || "";
        } else if (contentType === "forumComments") {
            initial.comentario = (item as AdminForumComment).comentario || "";
        } else if (contentType === "newsComments") {
            initial.comentario = (item as AdminNewsComment).comentario || "";
        } else if (contentType === "stories") {
            const s = item as AdminStory;
            initial.titulo = s.titulo || "";
            initial.status = s.status || "public";
        }
        setFormState(initial);
        onEdit();
    };

    // Handle save
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
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[color:var(--bg-800)]/50 border-b border-[color:var(--bg-700)]/50">
                <div>
                    <h3 className="font-semibold">
                        {contentType === "topics" && (item as AdminTopic).titulo}
                        {contentType === "articles" && (item as AdminArticle).titulo}
                        {contentType === "posts" && topicTitleById[(item as AdminPost).id_topico ?? 0]}
                        {(contentType === "forumComments" || contentType === "newsComments") && `Commentaire #${itemId}`}
                        {contentType === "stories" && ((item as AdminStory).titulo || `Story #${itemId}`)}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                        #{itemId} • {(item as { autor?: string }).autor || "—"} • {formatDateTime(
                            (item as { data?: string }).data
                            || (item as { date_created?: string }).date_created
                            || ((item as { dta?: number }).dta ? new Date(((item as { dta?: number }).dta ?? 0) * 1000).toISOString() : undefined)
                        )}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!isEditing ? (
                        <>
                            <Button variant="outline" size="sm" onClick={startEdit}>
                                <Pencil className="h-4 w-4 mr-1" /> Modifier
                            </Button>
                            <Button variant="destructive" size="sm" onClick={onDelete}>
                                <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                                <X className="h-4 w-4 mr-1" /> Annuler
                            </Button>
                            <Button size="sm" onClick={handleSave}>
                                <Save className="h-4 w-4 mr-1" /> Enregistrer
                            </Button>
                        </>
                    )}
                </div>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 p-4">
                {!isEditing ? (
                    <ViewContent item={item} contentType={contentType} />
                ) : (
                    <EditForm
                        contentType={contentType}
                        formState={formState}
                        setFormState={setFormState}
                    />
                )}
            </ScrollArea>
        </div>
    );
}

// View content (read-only)
function ViewContent({ item, contentType }: { item: ContentItem; contentType: ContentType }) {
    const getContent = () => {
        if (contentType === "topics") return (item as AdminTopic).conteudo;
        if (contentType === "articles") return (item as AdminArticle).noticia;
        if (contentType === "posts") return (item as AdminPost).conteudo;
        if (contentType === "forumComments") return (item as AdminForumComment).comentario;
        if (contentType === "newsComments") return (item as AdminNewsComment).comentario;
        return null; // stories have no HTML content
    };

    return (
        <div className="space-y-4">
            {(contentType === "topics" || contentType === "articles" || contentType === "stories") && (
                <div>
                    <Label className="text-xs text-muted-foreground">Titre</Label>
                    <p className="font-medium">{(item as AdminTopic | AdminArticle | AdminStory).titulo || "(sans titre)"}</p>
                </div>
            )}
            {contentType === "stories" && (
                <div className="space-y-3">
                    <div>
                        <Label className="text-xs text-muted-foreground">Image</Label>
                        <div className="mt-2 border rounded p-2 bg-black/20 text-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={`${process.env.NEXT_PUBLIC_DIRECTUS_URL || 'https://api.habbone.fr'}/assets/${(item as AdminStory).image || (item as AdminStory).imagem}`}
                                alt="Story"
                                className="max-h-[300px] max-w-full mx-auto rounded"
                            />
                            <p className="text-xs text-muted-foreground mt-2 break-all">{(item as AdminStory).image || (item as AdminStory).imagem}</p>
                        </div>
                    </div>
                    <div>
                        <Label className="text-xs text-muted-foreground">Statut</Label>
                        <div className="mt-1">
                            <Badge variant={(item as AdminStory).status === 'public' ? "default" : "outline"}>
                                {(item as AdminStory).status || 'N/A'}
                            </Badge>
                        </div>
                    </div>
                </div>
            )}
            {contentType === "articles" && (item as AdminArticle).descricao && (
                <div>
                    <Label className="text-xs text-muted-foreground">Résumé</Label>
                    <p className="text-sm">{(item as AdminArticle).descricao}</p>
                </div>
            )}
            {contentType === "topics" && (
                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <Checkbox checked={!!(item as AdminTopic).fixo} disabled />
                        <span className="text-sm">Épinglé</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox checked={!!(item as AdminTopic).fechado} disabled />
                        <span className="text-sm">Fermé</span>
                    </div>
                </div>
            )}
            {contentType !== "stories" && (
                <div>
                    <Label className="text-xs text-muted-foreground">Contenu</Label>
                    <div
                        className="prose prose-sm prose-invert max-w-none mt-2 p-3 bg-[color:var(--bg-800)]/30 rounded"
                        dangerouslySetInnerHTML={{ __html: getContent() || "<em>Aucun contenu</em>" }}
                    />
                </div>
            )}
        </div>
    );
}

// Edit form
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
        setFormState(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="space-y-4">
            {(contentType === "topics" || contentType === "articles" || contentType === "stories") && (
                <div>
                    <Label>Titre</Label>
                    <Input
                        value={formState.titulo as string || ""}
                        onChange={(e) => updateField("titulo", e.target.value)}
                        className="mt-1"
                    />
                </div>
            )}
            {contentType === "stories" && (
                <div>
                    <Label>Statut</Label>
                    <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                        value={formState.status as string || "public"}
                        onChange={(e) => updateField("status", e.target.value)}
                    >
                        <option value="public" className="bg-slate-800">Public (Visible)</option>
                        <option value="hidden" className="bg-slate-800">Masqué</option>
                        <option value="draft" className="bg-slate-800">Brouillon</option>
                    </select>
                </div>
            )}
            {contentType === "articles" && (
                <div>
                    <Label>Résumé</Label>
                    <Input
                        value={formState.descricao as string || ""}
                        onChange={(e) => updateField("descricao", e.target.value)}
                        className="mt-1"
                    />
                </div>
            )}
            {(contentType === "topics" || contentType === "articles") && (
                <div>
                    <Label>Image URL</Label>
                    <Input
                        value={formState.imagem as string || ""}
                        onChange={(e) => updateField("imagem", e.target.value)}
                        className="mt-1"
                    />
                </div>
            )}
            {contentType === "topics" && (
                <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="fixo"
                            checked={!!formState.fixo}
                            onCheckedChange={(checked) => updateField("fixo", !!checked)}
                        />
                        <Label htmlFor="fixo">Épinglé</Label>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="fechado"
                            checked={!!formState.fechado}
                            onCheckedChange={(checked) => updateField("fechado", !!checked)}
                        />
                        <Label htmlFor="fechado">Fermé</Label>
                    </div>
                </div>
            )}
            {contentType !== "stories" && (
                <div>
                    <Label>Contenu</Label>
                    <div className="mt-1">
                        <AdminRichEditor
                            value={
                                contentType === "articles"
                                    ? (formState.noticia as string || "")
                                    : (contentType === "forumComments" || contentType === "newsComments")
                                        ? (formState.comentario as string || "")
                                        : (formState.conteudo as string || "")
                            }
                            onChange={(html) => {
                                const fieldName = contentType === "articles"
                                    ? "noticia"
                                    : (contentType === "forumComments" || contentType === "newsComments")
                                        ? "comentario"
                                        : "conteudo";
                                updateField(fieldName, html);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
