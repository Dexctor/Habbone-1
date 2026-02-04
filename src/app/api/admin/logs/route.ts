import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { assertAdmin } from "@/server/authz";
import { getAdminLogs, getLogStats } from "@/server/directus/admin-logs";

export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        await assertAdmin();

        const { searchParams } = new URL(request.url);
        const page = Number(searchParams.get("page") || 1);
        const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
        const action = searchParams.get("action") || undefined;
        const adminId = searchParams.get("adminId") || undefined;
        const targetType = searchParams.get("targetType") || undefined;
        const fromDate = searchParams.get("fromDate") || undefined;
        const toDate = searchParams.get("toDate") || undefined;
        const stats = searchParams.get("stats") === "true";

        // If stats requested, return statistics instead
        if (stats) {
            const days = Number(searchParams.get("days") || 7);
            const statsData = await getLogStats(days);
            return NextResponse.json({ data: statsData });
        }

        const result = await getAdminLogs({
            page,
            limit,
            action: action as Parameters<typeof getAdminLogs>[0]["action"],
            adminId,
            targetType,
            fromDate,
            toDate,
        });

        return NextResponse.json({
            data: result.data,
            total: result.total,
            page,
            limit,
            pages: Math.ceil(result.total / limit),
        });
    } catch (error) {
        console.error("[API] /api/admin/logs error:", error);
        return NextResponse.json(
            { error: "Failed to fetch logs" },
            { status: 500 }
        );
    }
}
