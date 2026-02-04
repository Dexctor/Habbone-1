"use client";

import { useState, useMemo, useCallback, Fragment } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import RichEditor from "@/components/editor/RichEditor";
import { formatDateTime } from "@/lib/date-utils";
import type {
    AdminTopic,
    AdminPost,
    AdminArticle,
    AdminForumComment,
    AdminNewsComment,
    ServerActionFn,
} from "@/types/admin";

const PAGE_SIZE = 15;

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
}

export default function AdminContentManager(props: AdminContentManagerProps) {
    const {
        topics,
        posts,
        news,
        forumComments,
        newsComments,
        topicTitleById,
    } = props;

    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("topics");
    const [page, setPage] = useState(1);
    const [editingId, setEditingId] = useState<number | null>(null);

    const searchLower = search.trim().toLowerCase();

    // Reset page when search or tab changes
    const handleTabChange = useCallback((tab: string) => {
        setActiveTab(tab);
        setPage(1);
        setEditingId(null);
    }, []);

    const handleSearchChange = useCallback((value: string) => {
        setSearch(value);
        setPage(1);
    }, []);

    // Filter data based on search
    const filteredTopics = useMemo(() =>
        !searchLower ? topics : topics.filter(t =>
            `${t.titulo ?? ""} ${t.autor ?? ""} ${t.id}`.toLowerCase().includes(searchLower)
        ), [topics, searchLower]);

    const filteredPosts = useMemo(() =>
        !searchLower ? posts : posts.filter(p =>
            `${p.autor ?? ""} ${p.id} ${topicTitleById[p.id_topico ?? 0] ?? ""}`.toLowerCase().includes(searchLower)
        ), [posts, searchLower, topicTitleById]);

    const filteredNews = useMemo(() =>
        !searchLower ? news : news.filter(n =>
            `${n.titulo ?? ""} ${n.autor ?? ""} ${n.id}`.toLowerCase().includes(searchLower)
        ), [news, searchLower]);

    const filteredForumComments = useMemo(() =>
        !searchLower ? forumComments : forumComments.filter(c =>
            `${c.autor ?? ""} ${c.id}`.toLowerCase().includes(searchLower)
        ), [forumComments, searchLower]);

    const filteredNewsComments = useMemo(() =>
        !searchLower ? newsComments : newsComments.filter(c =>
            `${c.autor ?? ""} ${c.id}`.toLowerCase().includes(searchLower)
        ), [newsComments, searchLower]);

    // Get current data based on tab
    const getCurrentData = () => {
        switch (activeTab) {
            case "topics": return filteredTopics;
            case "posts": return filteredPosts;
            case "articles": return filteredNews;
            case "forumComments": return filteredForumComments;
            case "newsComments": return filteredNewsComments;
            default: return [];
        }
    };

    const currentData = getCurrentData();
    const totalPages = Math.max(1, Math.ceil(currentData.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const paginatedData = currentData.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    return (
        <div className="space-y-4">
            {/* Search bar - simple and clean */}
            <div className="flex items-center gap-4">
                <Input
                    placeholder="🔍 Rechercher..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="max-w-sm bg-[color:var(--bg-800)]/50"
                />
                <span className="text-sm text-muted-foreground">
                    {currentData.length} résultat{currentData.length !== 1 ? "s" : ""}
                </span>
            </div>

            {/* Simple tabs - much cleaner than accordions */}
            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-5 bg-[color:var(--bg-800)]/50">
                    <TabsTrigger value="topics" className="data-[state=active]:bg-[color:var(--bg-600)]">
                        Sujets ({filteredTopics.length})
                    </TabsTrigger>
                    <TabsTrigger value="posts" className="data-[state=active]:bg-[color:var(--bg-600)]">
                        Messages ({filteredPosts.length})
                    </TabsTrigger>
                    <TabsTrigger value="articles" className="data-[state=active]:bg-[color:var(--bg-600)]">
                        Articles ({filteredNews.length})
                    </TabsTrigger>
                    <TabsTrigger value="forumComments" className="data-[state=active]:bg-[color:var(--bg-600)]">
                        Comm. Forum ({filteredForumComments.length})
                    </TabsTrigger>
                    <TabsTrigger value="newsComments" className="data-[state=active]:bg-[color:var(--bg-600)]">
                        Comm. News ({filteredNewsComments.length})
                    </TabsTrigger>
                </TabsList>

                {/* Content areas */}
                <TabsContent value="topics" className="mt-4">
                    <ContentTable
                        items={paginatedData as AdminTopic[]}
                        columns={["ID", "Titre", "Auteur", "Date", "Vues", "Actions"]}
                        renderRow={(item: AdminTopic) => (
                            <>
                                <td className="px-3 py-2 text-sm">#{item.id}</td>
                                <td className="px-3 py-2">
                                    <span className="font-medium">{item.titulo || "(sans titre)"}</span>
                                    <div className="flex gap-1 mt-1">
                                        {item.fixo && <Badge variant="secondary" className="text-xs">📌 Épinglé</Badge>}
                                        {item.fechado && <Badge variant="outline" className="text-xs">🔒 Fermé</Badge>}
                                    </div>
                                </td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{item.autor || "—"}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDateTime(item.data)}</td>
                                <td className="px-3 py-2 text-sm">{item.views ?? 0}</td>
                                <td className="px-3 py-2">
                                    <ActionButtons
                                        id={item.id}
                                        isEditing={editingId === item.id}
                                        onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                                        onDelete={props.deleteTopic}
                                        deleteLabel={`Supprimer le sujet #${item.id} ?`}
                                    />
                                </td>
                            </>
                        )}
                        expandedId={editingId}
                        renderExpanded={(item: AdminTopic) => (
                            <TopicEditForm topic={item} onSubmit={props.updateTopic} onCancel={() => setEditingId(null)} />
                        )}
                        emptyMessage="Aucun sujet trouvé"
                    />
                </TabsContent>

                <TabsContent value="posts" className="mt-4">
                    <ContentTable
                        items={paginatedData as AdminPost[]}
                        columns={["ID", "Sujet", "Auteur", "Date", "Actions"]}
                        renderRow={(item: AdminPost) => (
                            <>
                                <td className="px-3 py-2 text-sm">#{item.id}</td>
                                <td className="px-3 py-2 font-medium">
                                    {topicTitleById[item.id_topico ?? 0] || `Sujet #${item.id_topico}`}
                                </td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{item.autor || "—"}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDateTime(item.data)}</td>
                                <td className="px-3 py-2">
                                    <ActionButtons
                                        id={item.id}
                                        isEditing={editingId === item.id}
                                        onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                                        onDelete={props.deletePost}
                                        deleteLabel={`Supprimer le message #${item.id} ?`}
                                    />
                                </td>
                            </>
                        )}
                        expandedId={editingId}
                        renderExpanded={(item: AdminPost) => (
                            <SimpleEditForm
                                id={item.id}
                                fieldName="conteudo"
                                initialValue={item.conteudo || ""}
                                label="Contenu"
                                onSubmit={props.updatePost}
                                onCancel={() => setEditingId(null)}
                                useRichEditor
                            />
                        )}
                        emptyMessage="Aucun message trouvé"
                    />
                </TabsContent>

                <TabsContent value="articles" className="mt-4">
                    <ContentTable
                        items={paginatedData as AdminArticle[]}
                        columns={["ID", "Titre", "Auteur", "Date", "Actions"]}
                        renderRow={(item: AdminArticle) => (
                            <>
                                <td className="px-3 py-2 text-sm">#{item.id}</td>
                                <td className="px-3 py-2">
                                    <span className="font-medium">{item.titulo || "(sans titre)"}</span>
                                    {item.descricao && (
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{item.descricao}</p>
                                    )}
                                </td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{item.autor || "—"}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDateTime(item.data)}</td>
                                <td className="px-3 py-2">
                                    <ActionButtons
                                        id={item.id}
                                        isEditing={editingId === item.id}
                                        onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                                        onDelete={props.deleteArticle}
                                        deleteLabel={`Supprimer l'article #${item.id} ?`}
                                    />
                                </td>
                            </>
                        )}
                        expandedId={editingId}
                        renderExpanded={(item: AdminArticle) => (
                            <ArticleEditForm article={item} onSubmit={props.updateArticle} onCancel={() => setEditingId(null)} />
                        )}
                        emptyMessage="Aucun article trouvé"
                    />
                </TabsContent>

                <TabsContent value="forumComments" className="mt-4">
                    <ContentTable
                        items={paginatedData as AdminForumComment[]}
                        columns={["ID", "Auteur", "Sujet", "Date", "Actions"]}
                        renderRow={(item: AdminForumComment) => (
                            <>
                                <td className="px-3 py-2 text-sm">#{item.id}</td>
                                <td className="px-3 py-2 text-sm">{item.autor || "—"}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">Sujet #{item.id_forum}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDateTime(item.data)}</td>
                                <td className="px-3 py-2">
                                    <ActionButtons
                                        id={item.id}
                                        isEditing={editingId === item.id}
                                        onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                                        onDelete={props.deleteForumComment}
                                        deleteLabel={`Supprimer le commentaire #${item.id} ?`}
                                    />
                                </td>
                            </>
                        )}
                        expandedId={editingId}
                        renderExpanded={(item: AdminForumComment) => (
                            <SimpleEditForm
                                id={item.id}
                                fieldName="comentario"
                                initialValue={item.comentario || ""}
                                label="Commentaire"
                                onSubmit={props.updateForumComment}
                                onCancel={() => setEditingId(null)}
                                useRichEditor
                            />
                        )}
                        emptyMessage="Aucun commentaire trouvé"
                    />
                </TabsContent>

                <TabsContent value="newsComments" className="mt-4">
                    <ContentTable
                        items={paginatedData as AdminNewsComment[]}
                        columns={["ID", "Auteur", "Article", "Date", "Actions"]}
                        renderRow={(item: AdminNewsComment) => (
                            <>
                                <td className="px-3 py-2 text-sm">#{item.id}</td>
                                <td className="px-3 py-2 text-sm">{item.autor || "—"}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">Article #{item.id_noticia}</td>
                                <td className="px-3 py-2 text-sm text-muted-foreground">{formatDateTime(item.data)}</td>
                                <td className="px-3 py-2">
                                    <ActionButtons
                                        id={item.id}
                                        isEditing={editingId === item.id}
                                        onEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                                        onDelete={props.deleteNewsComment}
                                        deleteLabel={`Supprimer le commentaire #${item.id} ?`}
                                    />
                                </td>
                            </>
                        )}
                        expandedId={editingId}
                        renderExpanded={(item: AdminNewsComment) => (
                            <SimpleEditForm
                                id={item.id}
                                fieldName="comentario"
                                initialValue={item.comentario || ""}
                                label="Commentaire"
                                onSubmit={props.updateNewsComment}
                                onCancel={() => setEditingId(null)}
                                useRichEditor
                            />
                        )}
                        emptyMessage="Aucun commentaire trouvé"
                    />
                </TabsContent>
            </Tabs>

            {/* Simple pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-[color:var(--bg-700)]/50">
                    <span className="text-sm text-muted-foreground">
                        Page {safePage} sur {totalPages}
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={safePage <= 1}
                        >
                            ← Précédent
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={safePage >= totalPages}
                        >
                            Suivant →
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ============ Sub-components ============

interface ContentTableProps<T extends { id: number }> {
    items: T[];
    columns: string[];
    renderRow: (item: T) => React.ReactNode;
    expandedId: number | null;
    renderExpanded: (item: T) => React.ReactNode;
    emptyMessage: string;
}

function ContentTable<T extends { id: number }>({
    items,
    columns,
    renderRow,
    expandedId,
    renderExpanded,
    emptyMessage,
}: ContentTableProps<T>) {
    if (!items.length) {
        return <p className="text-center py-8 text-muted-foreground">{emptyMessage}</p>;
    }

    return (
        <ScrollArea className="max-h-[500px]">
            <table className="w-full">
                <thead className="sticky top-0 bg-[color:var(--bg-800)]">
                    <tr className="border-b border-[color:var(--bg-700)]/50">
                        {columns.map(col => (
                            <th key={col} className="px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {items.map((item) => (
                        <Fragment key={item.id}>
                            <tr className="border-b border-[color:var(--bg-700)]/30 hover:bg-[color:var(--bg-700)]/20 transition-colors">
                                {renderRow(item)}
                            </tr>
                            {expandedId === item.id && (
                                <tr>
                                    <td colSpan={columns.length} className="bg-[color:var(--bg-900)]/50 p-4">
                                        {renderExpanded(item)}
                                    </td>
                                </tr>
                            )}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </ScrollArea>
    );
}

interface ActionButtonsProps {
    id: number;
    isEditing: boolean;
    onEdit: () => void;
    onDelete?: ServerActionFn;
    deleteLabel: string;
}

function ActionButtons({ id, isEditing, onEdit, onDelete, deleteLabel }: ActionButtonsProps) {
    return (
        <div className="flex gap-1">
            <Button
                type="button"
                variant={isEditing ? "secondary" : "ghost"}
                size="sm"
                onClick={onEdit}
                title={isEditing ? "Fermer" : "Modifier"}
            >
                {isEditing ? "✕" : "✏️"}
            </Button>
            {onDelete && (
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" title="Supprimer">
                            🗑️
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Confirmer la suppression</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">{deleteLabel}</p>
                        <DialogFooter>
                            <form action={onDelete}>
                                <input type="hidden" name="id" value={id} />
                                <Button type="submit" variant="destructive" size="sm">
                                    Supprimer
                                </Button>
                            </form>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}

// Edit forms
interface SimpleEditFormProps {
    id: number;
    fieldName: string;
    initialValue: string;
    label: string;
    onSubmit: ServerActionFn;
    onCancel: () => void;
    useRichEditor?: boolean;
}

function SimpleEditForm({ id, fieldName, initialValue, label, onSubmit, onCancel, useRichEditor }: SimpleEditFormProps) {
    return (
        <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <div className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                {useRichEditor ? (
                    <RichEditor name={fieldName} initialHTML={initialValue} variant="simple" />
                ) : (
                    <Input name={fieldName} defaultValue={initialValue} />
                )}
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm">💾 Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
            </div>
        </form>
    );
}

interface TopicEditFormProps {
    topic: AdminTopic;
    onSubmit: ServerActionFn;
    onCancel: () => void;
}

function TopicEditForm({ topic, onSubmit, onCancel }: TopicEditFormProps) {
    return (
        <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="id" value={topic.id} />
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Titre</label>
                    <Input name="titulo" defaultValue={topic.titulo || ""} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Image (UUID)</label>
                    <Input name="imagem" defaultValue={topic.imagem || ""} />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Contenu</label>
                <RichEditor name="conteudo" initialHTML={topic.conteudo || ""} variant="full" />
            </div>
            <div className="flex items-center gap-6 text-sm">
                <label className="flex items-center gap-2">
                    <input type="checkbox" name="fixo" defaultChecked={!!topic.fixo} />
                    <span>📌 Épinglé</span>
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" name="fechado" defaultChecked={!!topic.fechado} />
                    <span>🔒 Fermé</span>
                </label>
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm">💾 Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
            </div>
        </form>
    );
}

interface ArticleEditFormProps {
    article: AdminArticle;
    onSubmit: ServerActionFn;
    onCancel: () => void;
}

function ArticleEditForm({ article, onSubmit, onCancel }: ArticleEditFormProps) {
    return (
        <form action={onSubmit} className="space-y-4">
            <input type="hidden" name="id" value={article.id} />
            <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Titre</label>
                    <Input name="titulo" defaultValue={article.titulo || ""} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Input name="descricao" defaultValue={article.descricao || ""} />
                </div>
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Image (UUID)</label>
                <Input name="imagem" defaultValue={article.imagem || ""} />
            </div>
            <div className="space-y-2">
                <label className="text-sm font-medium">Contenu</label>
                <RichEditor name="noticia" initialHTML={article.noticia || ""} variant="full" />
            </div>
            <div className="flex gap-2">
                <Button type="submit" size="sm">💾 Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Annuler</Button>
            </div>
        </form>
    );
}
