import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { assertAdmin } from "@/server/authz";
import { directusService, rItems } from "@/server/directus/client";

interface UserHistoryData {
    topics: { id: number; titulo: string; data: string }[];
    articles: { id: number; titulo: string; data: string }[];
    forumComments: { id: number; id_forum: number; data: string }[];
    newsComments: { id: number; id_noticia: number; data: string }[];
    adminLogs: { id: number; action: string; created_at: string; admin_name: string }[];
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

        // Fetch user activity in parallel
        const [topics, articles, forumComments, newsComments, adminLogs] = await Promise.all([
            // Topics created by user
            directusService.request(
                rItems("forum_topicos" as any, {
                    filter: { autor: { _eq: userId } },
                    fields: ["id", "titulo", "data"],
                    sort: ["-data"],
                    limit: 50,
                } as any)
            ).catch(() => []) as Promise<UserHistoryData["topics"]>,

            // Articles by user (if autor field matches)
            directusService.request(
                rItems("noticias" as any, {
                    filter: { autor: { _eq: userId } },
                    fields: ["id", "titulo", "data"],
                    sort: ["-data"],
                    limit: 50,
                } as any)
            ).catch(() => []) as Promise<UserHistoryData["articles"]>,

            // Forum comments by user
            directusService.request(
                rItems("forum_coment" as any, {
                    filter: { autor: { _eq: userId } },
                    fields: ["id", "id_forum", "data"],
                    sort: ["-data"],
                    limit: 50,
                } as any)
            ).catch(() => []) as Promise<UserHistoryData["forumComments"]>,

            // News comments by user
            directusService.request(
                rItems("noticias_coment" as any, {
                    filter: { autor: { _eq: userId } },
                    fields: ["id", "id_noticia", "data"],
                    sort: ["-data"],
                    limit: 50,
                } as any)
            ).catch(() => []) as Promise<UserHistoryData["newsComments"]>,

            // Admin actions targeting this user
            directusService.request(
                rItems("admin_logs" as any, {
                    filter: { target_id: { _eq: userId }, target_type: { _eq: "user" } },
                    fields: ["id", "action", "date_created", "admin_name"],
                    sort: ["-date_created"],
                    limit: 20,
                } as any)
            ).catch(() => []) as Promise<{ id: number; action: string; date_created: string; admin_name: string }[]>,
        ]);

        const history: UserHistoryData = {
            topics: topics || [],
            articles: articles || [],
            forumComments: forumComments || [],
            newsComments: newsComments || [],
            adminLogs: (adminLogs || []).map((log) => ({
                ...log,
                created_at: log.date_created,
            })),
        };

        return NextResponse.json({
            data: history,
            stats: {
                topics: history.topics.length,
                articles: history.articles.length,
                forumComments: history.forumComments.length,
                newsComments: history.newsComments.length,
                sanctions: history.adminLogs.filter((l) => l.action === "user.ban").length,
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
