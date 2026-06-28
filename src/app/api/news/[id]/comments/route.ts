import { NextResponse } from "next/server";
import { revalidateTag } from 'next/cache';
import { z } from "zod";
import { withAuth } from '@/server/api-helpers';
import { createNewsComment } from "@/server/pocketbase/news";
import { buildError, formatZodError } from "@/types/api";
import { sanitizeCommentBody } from "@/server/comment-sanitize";

const BodySchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Commentaire requis")
    .max(5000, "Commentaire trop long"),
});

export const POST = withAuth(async (req, { nick, user, params }) => {
  const newsId = String(params?.id ?? '');
  if (!newsId) {
    return NextResponse.json(buildError("Identifiant article invalide", { code: "INVALID_ID" }), {
      status: 400,
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(buildError("Requete invalide", { code: "INVALID_JSON" }), {
      status: 400,
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      buildError("Corps invalide", { code: "INVALID_BODY", fields: formatZodError(parsed.error).fieldErrors }),
      { status: 400 },
    );
  }

  const htmlContent = parsed.data.content;
  const { sanitizedHtml, plain } = sanitizeCommentBody(htmlContent);
  if (!plain) {
    return NextResponse.json(buildError("Commentaire vide", { code: "EMPTY_COMMENT" }), {
      status: 400 },
    );
  }

  try {
    const created = await createNewsComment({
      newsId,
      author: String(nick || user?.email || "Anonyme"),
      content: sanitizedHtml,
    });
    revalidateTag('news');
    revalidateTag('news-' + newsId);
    return NextResponse.json({ ok: true, data: created });
  } catch (error) {
    return NextResponse.json(buildError("Echec de publication", { code: "CREATE_FAILED" }), {
      status: 500 },
    );
  }
}, { key: 'news:comment', limit: 10, windowMs: 10 * 60 * 1000 })
