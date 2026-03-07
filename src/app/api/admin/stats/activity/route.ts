import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { assertAdmin } from "@/server/authz";
import { directusService, rItems } from "@/server/directus/client";
import { aggregate } from "@directus/sdk";

interface DayCount {
    date: string;
    count: number;
}

interface ActivityStats {
    daily: {
        topics: DayCount[];
        articles: DayCount[];
        comments: DayCount[];
    };
    totals: {
        topics: number;
        articles: number;
        forumComments: number;
        newsComments: number;
        users: number;
    };
    distribution: {
        name: string;
        value: number;
    }[];
}

async function getCountByDay(
    collection: string,
    dateField: string,
    days: number
): Promise<DayCount[]> {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);
    const fromDateStr = fromDate.toISOString().split("T")[0];

    try {
        // Fetch all items without date filter (Directus may not support date filtering on this field)
        // Then filter in memory
        const rows = await directusService.request(
            rItems(collection, {
                fields: [dateField],
                limit: 5000,
                sort: [`-${dateField}`],
            })
        ) as Record<string, string | Date>[];

        // Group by day, filtering for recent items
        const byDay: Record<string, number> = {};
        for (const row of rows || []) {
            const dateValue = row[dateField];
            if (!dateValue) continue;

            // Handle both Date objects and string dates
            let day: string;
            if (dateValue instanceof Date) {
                day = dateValue.toISOString().split("T")[0];
            } else if (typeof dateValue === "string") {
                day = dateValue.split("T")[0];
            } else {
                continue; // Skip invalid date values
            }

            // Filter for recent days only
            if (day >= fromDateStr) {
                byDay[day] = (byDay[day] || 0) + 1;
            }
        }

        // Fill missing days with 0
        const result: DayCount[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split("T")[0];
            result.push({ date: dateStr, count: byDay[dateStr] || 0 });
        }

        return result;
    } catch (error) {
        console.error(`[ActivityStats] Error counting ${collection}:`, error);
        // Return empty days array on error
        const result: DayCount[] = [];
        for (let i = days - 1; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            result.push({ date: d.toISOString().split("T")[0], count: 0 });
        }
        return result;
    }
}

async function getTotal(collection: string): Promise<number> {
    try {
        const result = await (directusService as any).request(
            aggregate(collection as any, { aggregate: { count: "*" } } as any)
        );
        return Number((result as Record<string, unknown>[])?.[0]?.count ?? 0);
    } catch {
        return 0;
    }
}

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await assertAdmin();

        const { searchParams } = new URL(request.url);
        const days = Math.min(Number(searchParams.get("days") || 7), 90);

        // Fetch all data in parallel
        const [
            topicsDaily,
            articlesDaily,
            forumCommentsDaily,
            newsCommentsDaily,
            topicsTotal,
            articlesTotal,
            forumCommentsTotal,
            newsCommentsTotal,
            usersTotal,
        ] = await Promise.all([
            getCountByDay("forum_topicos", "data", days),
            getCountByDay("noticias", "data", days),
            getCountByDay("forum_coment", "data", days),
            getCountByDay("noticias_coment", "data", days),
            getTotal("forum_topicos"),
            getTotal("noticias"),
            getTotal("forum_coment"),
            getTotal("noticias_coment"),
            getTotal("usuarios"),
        ]);

        // Merge comments for combined daily view
        const commentsDaily: DayCount[] = forumCommentsDaily.map((fc, i) => ({
            date: fc.date,
            count: fc.count + (newsCommentsDaily[i]?.count || 0),
        }));

        const stats: ActivityStats = {
            daily: {
                topics: topicsDaily,
                articles: articlesDaily,
                comments: commentsDaily,
            },
            totals: {
                topics: topicsTotal,
                articles: articlesTotal,
                forumComments: forumCommentsTotal,
                newsComments: newsCommentsTotal,
                users: usersTotal,
            },
            distribution: [
                { name: "Articles", value: articlesTotal },
                { name: "Sujets", value: topicsTotal },
                { name: "Commentaires", value: forumCommentsTotal + newsCommentsTotal },
            ],
        };

        return NextResponse.json({ data: stats, days });
    } catch (error) {
        console.error("[API] /api/admin/stats/activity error:", error);
        return NextResponse.json(
            { error: "Failed to fetch activity stats" },
            { status: 500 }
        );
    }
}
