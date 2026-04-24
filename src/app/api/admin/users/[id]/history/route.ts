import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { assertAdmin } from "@/server/authz";
import { directusUrl, serviceToken } from "@/server/directus/client";
import { TABLES, USE_V2 } from "@/server/directus/tables";

const USERS_TABLE = TABLES.users;

async function fetchItems(table: string, filter: Record<string, any>, fields: string[], sort: string, limit = 50): Promise<any[]> {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(table)}`);
    url.searchParams.set('fields', fields.join(','));
    url.searchParams.set('sort', sort);
    url.searchParams.set('limit', String(limit));
    for (const [key, val] of Object.entries(filter)) {
        if (typeof val === 'object' && val !== null) {
            for (const [op, v] of Object.entries(val)) {
                url.searchParams.set(`filter[${key}][${op}]`, String(v));
            }
        }
    }
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${serviceToken}` },
        cache: 'no-store',
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
}

async function getUserNickById(userId: string): Promise<string | null> {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(USERS_TABLE)}/${userId}`);
    url.searchParams.set('fields', 'nick');
    const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${serviceToken}` },
        cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.nick || null;
}

/**
 * Normalise a v2 row into the legacy shape the frontend expects
 * (titulo/comentario/autor/data).
 */
function normaliseRow(row: any, kind: 'topic' | 'article' | 'forumComment' | 'articleComment'): any {
    if (!USE_V2) return row;
    const unixData = row.created_at ? Math.floor(Date.parse(row.created_at) / 1000).toString() : row.published_at ? Math.floor(Date.parse(row.published_at) / 1000).toString() : null;
    switch (kind) {
        case 'topic':
            return { id: row.id, titulo: row.title, data: unixData };
        case 'article':
            return { id: row.id, titulo: row.title, data: unixData };
        case 'forumComment':
            return { id: row.id, id_forum: row.topic, comentario: row.content, data: unixData };
        case 'articleComment':
            return { id: row.id, id_noticia: row.article, comentario: row.content, data: unixData };
    }
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await assertAdmin();

        const { id: userId } = await params;
        if (!userId) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        const cleanId = userId.startsWith('legacy:') ? userId.split(':')[1] : userId;

        // Build filter: v2 filters on user id, legacy on nick string
        let filter: Record<string, any>;
        let authorField: string;
        let sortField: string;
        let topicFields: string[];
        let articleFields: string[];
        let forumCommentFields: string[];
        let articleCommentFields: string[];

        if (USE_V2) {
            authorField = 'author';
            sortField = '-created_at';
            filter = { author: { _eq: Number(cleanId) } };
            topicFields = ['id', 'title', 'created_at'];
            articleFields = ['id', 'title', 'created_at', 'published_at'];
            forumCommentFields = ['id', 'topic', 'content', 'created_at'];
            articleCommentFields = ['id', 'article', 'content', 'created_at'];
        } else {
            authorField = 'autor';
            sortField = '-data';
            const nick = (await getUserNickById(cleanId)) || cleanId;
            filter = { autor: { _eq: nick } };
            topicFields = ['id', 'titulo', 'data'];
            articleFields = ['id', 'titulo', 'data'];
            forumCommentFields = ['id', 'id_forum', 'comentario', 'data'];
            articleCommentFields = ['id', 'id_noticia', 'comentario', 'data'];
        }

        const [rawTopics, rawArticles, rawForumComments, rawArticleComments] = await Promise.all([
            fetchItems(TABLES.forumTopics, filter, topicFields, sortField),
            fetchItems(TABLES.articles, filter, articleFields, sortField),
            fetchItems(TABLES.forumComments, filter, forumCommentFields, sortField),
            fetchItems(TABLES.articleComments, filter, articleCommentFields, sortField),
        ]);

        let topics = rawTopics.map((r) => normaliseRow(r, 'topic'));
        let articles = rawArticles.map((r) => normaliseRow(r, 'article'));
        let forumComments = rawForumComments.map((r) => normaliseRow(r, 'forumComment'));
        let newsComments = rawArticleComments.map((r) => normaliseRow(r, 'articleComment'));

        // Legacy: try case-insensitive fallback if nothing found
        if (!USE_V2 && !topics.length && !articles.length && !forumComments.length && !newsComments.length) {
            const nick = String(filter.autor?._eq || '');
            if (nick) {
                const nickLower = nick.toLowerCase();
                const nickCapital = nick.charAt(0).toUpperCase() + nick.slice(1).toLowerCase();
                const altNick = nick === nickCapital ? nickLower : nickCapital;
                const altFilter = { autor: { _eq: altNick } };

                const [t2, a2, fc2, nc2] = await Promise.all([
                    fetchItems(TABLES.forumTopics, altFilter, topicFields, sortField),
                    fetchItems(TABLES.articles, altFilter, articleFields, sortField),
                    fetchItems(TABLES.forumComments, altFilter, forumCommentFields, sortField),
                    fetchItems(TABLES.articleComments, altFilter, articleCommentFields, sortField),
                ]);
                topics = [...topics, ...t2];
                articles = [...articles, ...a2];
                forumComments = [...forumComments, ...fc2];
                newsComments = [...newsComments, ...nc2];
            }
        }

        return NextResponse.json({
            data: {
                topics,
                articles,
                forumComments,
                newsComments,
                adminLogs: [],
            },
            stats: {
                topics: topics.length,
                articles: articles.length,
                forumComments: forumComments.length,
                newsComments: newsComments.length,
                sanctions: 0,
            },
        });
    } catch (error) {
        console.error("[API] User history error:", error);
        return NextResponse.json(
            { error: "Failed to fetch user history" },
            { status: 500 }
        );
    }
}
