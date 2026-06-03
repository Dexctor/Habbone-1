import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { assertAdmin } from "@/server/authz";
import { pbList } from "@/server/directus/pb-helpers";
import { TABLES } from "@/server/directus/tables";

/**
 * GET /api/admin/users/[id]/history
 * Aggregates a user's content (forum topics/comments, article comments) into
 * the legacy shape the frontend expects (titulo/comentario/data).
 *
 * v2 schema: every collection links the author via the `author` relation
 * (user id). Topics/articles expose a title; comments expose `content` and a
 * parent relation (`topic` / `article`).
 */

/** ISO/PB datetime -> unix-seconds string (legacy `data` format). */
function toUnixSecondsString(value: string | null | undefined): string | null {
    if (!value) return null;
    const ms = Date.parse(String(value).replace(' ', 'T'));
    return Number.isFinite(ms) ? Math.floor(ms / 1000).toString() : null;
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

        // PocketBase ids are strings; strip the optional legacy: prefix.
        const cleanId = userId.startsWith('legacy:') ? userId.split(':')[1] : userId;
        const filter = { author: { _eq: cleanId } };

        const [rawTopics, rawArticles, rawForumComments, rawArticleComments] = await Promise.all([
            pbList<any>(TABLES.forumTopics, {
                filter,
                fields: 'id,title,created',
                sort: '-created',
                perPage: 50,
            }).catch(() => [] as any[]),
            pbList<any>(TABLES.articles, {
                filter,
                fields: 'id,title,published_at',
                sort: '-published_at',
                perPage: 50,
            }).catch(() => [] as any[]),
            pbList<any>(TABLES.forumComments, {
                filter,
                fields: 'id,topic,content,created',
                sort: '-created',
                perPage: 50,
            }).catch(() => [] as any[]),
            pbList<any>(TABLES.articleComments, {
                filter,
                fields: 'id,article,content,created',
                sort: '-created',
                perPage: 50,
            }).catch(() => [] as any[]),
        ]);

        const topics = rawTopics.map((r) => ({
            id: r.id,
            titulo: r.title,
            data: toUnixSecondsString(r.created),
        }));
        const articles = rawArticles.map((r) => ({
            id: r.id,
            titulo: r.title,
            data: toUnixSecondsString(r.published_at),
        }));
        const forumComments = rawForumComments.map((r) => ({
            id: r.id,
            id_forum: r.topic,
            comentario: r.content,
            data: toUnixSecondsString(r.created),
        }));
        const newsComments = rawArticleComments.map((r) => ({
            id: r.id,
            id_noticia: r.article,
            comentario: r.content,
            data: toUnixSecondsString(r.created),
        }));

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
