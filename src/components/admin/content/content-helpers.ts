import type {
  ForumCommentRecord as AdminForumComment,
  ForumPostRecord as AdminPost,
  ForumTopicRecord as AdminTopic,
  NewsCommentRecord as AdminNewsComment,
  NewsRecord as AdminArticle,
  StoryRecord as AdminStory,
} from "@/server/directus/types";

export type ContentType =
  | "topics"
  | "posts"
  | "articles"
  | "forumComments"
  | "newsComments"
  | "stories";

export type ContentItem =
  | AdminTopic
  | AdminPost
  | AdminArticle
  | AdminForumComment
  | AdminNewsComment
  | AdminStory;

export type ServerActionFn = (formData: FormData) => Promise<void>;

export const PAGE_SIZE = 20;

export const CONTENT_ORDER: ContentType[] = [
  "articles",
  "topics",
  "posts",
  "forumComments",
  "newsComments",
  "stories",
];

export const CONTENT_SECTIONS: Record<ContentType, { label: string; description: string }> = {
  topics: { label: "Sujets forum", description: "Éditer ou modérer les sujets." },
  posts: { label: "Messages forum", description: "Réponses liées aux sujets." },
  articles: { label: "Articles", description: "Titres, résumés et contenu." },
  forumComments: { label: "Commentaires forum", description: "Réactions du forum." },
  newsComments: { label: "Commentaires news", description: "Réactions sur les articles." },
  stories: { label: "Stories", description: "Titre, média et statut." },
};

/**
 * Re-exported for UI components that want to show an icon next to each content
 * type. Using a plain object (not a React component) so this file stays type-only
 * friendly — callers import lucide icons on their side.
 */
export type ContentTypeMeta = {
  label: string;
  description: string;
  /** Short placeholder to show when the list is empty for this type. */
  emptyHint: string;
};

export const CONTENT_META: Record<ContentType, ContentTypeMeta> = {
  articles: {
    label: "Articles",
    description: "Actualités publiées sur le site.",
    emptyHint: "Aucun article publié pour le moment.",
  },
  topics: {
    label: "Sujets forum",
    description: "Discussions créées par les membres.",
    emptyHint: "Aucun sujet de forum.",
  },
  posts: {
    label: "Messages forum",
    description: "Réponses dans les discussions.",
    emptyHint: "Aucun message de forum.",
  },
  forumComments: {
    label: "Commentaires forum",
    description: "Réactions aux sujets et messages.",
    emptyHint: "Aucun commentaire sur le forum.",
  },
  newsComments: {
    label: "Commentaires news",
    description: "Réactions aux articles.",
    emptyHint: "Aucun commentaire sur les articles.",
  },
  stories: {
    label: "Stories",
    description: "Stories membres (image + légende).",
    emptyHint: "Aucune story.",
  },
};

const DIRECTUS_BASE_URL = (process.env.NEXT_PUBLIC_DIRECTUS_URL || "").replace(/\/$/, "");

export function getItemTitle(
  item: ContentItem,
  contentType: ContentType,
  topicTitleById: Record<number, string>,
): string {
  if (contentType === "topics") return (item as AdminTopic).titulo || "(sans titre)";
  if (contentType === "articles") return (item as AdminArticle).titulo || "(sans titre)";
  if (contentType === "posts") {
    return topicTitleById[(item as AdminPost).id_topico ?? 0] || `Sujet #${(item as AdminPost).id_topico}`;
  }
  if (contentType === "forumComments") return `Commentaire sujet #${(item as AdminForumComment).id_forum}`;
  if (contentType === "newsComments") return `Commentaire article #${(item as AdminNewsComment).id_noticia}`;
  return (item as AdminStory).titulo || `Story #${(item as AdminStory).id}`;
}

export function resolveItemDate(item: ContentItem): string | undefined {
  return (
    (item as { data?: string | null }).data ||
    (item as { date_created?: string | null }).date_created ||
    (((item as { dta?: number | null }).dta ?? 0) > 0
      ? new Date(((item as { dta?: number | null }).dta ?? 0) * 1000).toISOString()
      : undefined)
  );
}

export function resolveAssetUrl(value?: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("/")) return value;
  return `${DIRECTUS_BASE_URL}/assets/${value}`;
}

/**
 * Short excerpt from a free-form text field (strips HTML tags, clamps length).
 * Used in the list cards so admins can tell items apart without opening them.
 */
export function extractExcerpt(html: string | null | undefined, max = 120): string {
  if (!html) return "";
  const plain = String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max - 1).trimEnd() + "…";
}

