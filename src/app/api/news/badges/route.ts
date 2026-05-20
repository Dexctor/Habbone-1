import { NextResponse } from "next/server";
import { listPublicNewsBadges } from "@/server/directus/news";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await listPublicNewsBadges();
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("[api/news/badges] failed", error);
    return NextResponse.json(
      {
        data: [],
        error: error?.message || "NEWS_BADGES_FETCH_FAILED",
        code: "NEWS_BADGES_FETCH_FAILED",
      },
    );
  }
}
