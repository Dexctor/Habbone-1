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
  topics: { label: "Sujets forum", description: "Editer ou moderer les sujets." },
  posts: { label: "Messages forum", description: "Reponses liees aux sujets." },
  articles: { label: "Articles", description: "Titres, resumes et contenu." },
  forumComments: { label: "Com. forum", description: "Reactions du forum." },
  newsComments: { label: "Com. news", description: "Reactions des articles." },
  stories: { label: "Stories", description: "Titre, media et statut." },
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
  if (contentType === "forumComments") return `Com. sujet #${(item as AdminForumComment).id_forum}`;
  if (contentType === "newsComments") return `Com. article #${(item as AdminNewsComment).id_noticia}`;
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
