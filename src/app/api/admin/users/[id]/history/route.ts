import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { assertAdmin } from "@/server/authz";
import { directusUrl, serviceToken, USERS_TABLE } from "@/server/directus/client";

async function fetchItems(table: string, filter: Record<string, any>, fields: string[], limit = 50): Promise<any[]> {
    const url = new URL(`${directusUrl}/items/${encodeURIComponent(table)}`);
    url.searchParams.set('fields', fields.join(','));
    url.searchParams.set('sort', '-data');
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

        // The userId is the numeric ID, but autor fields store the nick
        // First resolve the nick, also try using userId directly as nick (for legacy:XX IDs)
        const cleanId = userId.startsWith('legacy:') ? userId.split(':')[1] : userId;
        let nick = await getUserNickById(cleanId);

        // If no nick found, the userId itself might be a nick
        if (!nick) nick = cleanId;

        // Fetch user activity by nick (autor field)
        const [topics, articles, forumComments, newsComments] = await Promise.all([
            fetchItems('forum_topicos', { autor: { _eq: nick } }, ['id', 'titulo', 'data']),
            fetchItems('noticias', { autor: { _eq: nick } }, ['id', 'titulo', 'data']),
            fetchItems('forum_coment', { autor: { _eq: nick } }, ['id', 'id_forum', 'comentario', 'data']),
            fetchItems('noticias_coment', { autor: { _eq: nick } }, ['id', 'id_noticia', 'comentario', 'data']),
        ]);

        // Also try case-insensitive match if results are empty
        let allTopics = topics;
        let allArticles = articles;
        let allForumComments = forumComments;
        let allNewsComments = newsComments;

        if (!topics.length && !articles.length && !forumComments.length && !newsComments.length && nick) {
            // Try with different casing (e.g., "decrypt" vs "Decrypt")
            const nickLower = nick.toLowerCase();
            const nickCapital = nick.charAt(0).toUpperCase() + nick.slice(1).toLowerCase();
            const altNick = nick === nickCapital ? nickLower : nickCapital;

            const [t2, a2, fc2, nc2] = await Promise.all([
                fetchItems('forum_topicos', { autor: { _eq: altNick } }, ['id', 'titulo', 'data']),
                fetchItems('noticias', { autor: { _eq: altNick } }, ['id', 'titulo', 'data']),
                fetchItems('forum_coment', { autor: { _eq: altNick } }, ['id', 'id_forum', 'comentario', 'data']),
                fetchItems('noticias_coment', { autor: { _eq: altNick } }, ['id', 'id_noticia', 'comentario', 'data']),
            ]);
            allTopics = [...topics, ...t2];
            allArticles = [...articles, ...a2];
            allForumComments = [...forumComments, ...fc2];
            allNewsComments = [...newsComments, ...nc2];
        }

        return NextResponse.json({
            data: {
                topics: allTopics,
                articles: allArticles,
                forumComments: allForumComments,
                newsComments: allNewsComments,
                adminLogs: [],
            },
            stats: {
                topics: allTopics.length,
                articles: allArticles.length,
                forumComments: allForumComments.length,
                newsComments: allNewsComments.length,
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
