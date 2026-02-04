/**
 * Admin TypeScript types
 * Re-exports existing types and adds admin-specific types
 */

// Re-export existing Directus types for admin components
export type {
    NewsRecord as AdminArticle,
    NewsCommentRecord as AdminNewsComment,
    ForumTopicRecord as AdminTopic,
    ForumPostRecord as AdminPost,
    ForumCommentRecord as AdminForumComment,
} from "@/server/directus/types";

// Summary stat for dashboard
export interface SummaryStat {
    label: string;
    value: number;
    icon?: React.ReactNode;
    trend?: string;
}

// Admin status for fallback detection
export interface AdminStatus {
    rolesVirtual: boolean;
    usersFallback: boolean;
    usersSource: "legacy" | "directus" | "unknown";
}

// Server action function type
export type ServerActionFn = (formData: FormData) => Promise<void>;

// Content section types
export type ContentSection = "topics" | "posts" | "articles" | "forumComments" | "newsComments" | "users";

// Admin dashboard props
export interface AdminDashboardProps {
    stats: SummaryStat[];
    topics: import("@/server/directus/types").ForumTopicRecord[];
    posts: import("@/server/directus/types").ForumPostRecord[];
    news: import("@/server/directus/types").NewsRecord[];
    forumComments: import("@/server/directus/types").ForumCommentRecord[];
    newsComments: import("@/server/directus/types").NewsCommentRecord[];
    topicTitleById: Record<number, string>;
    updateTopic: ServerActionFn;
    deleteTopic: ServerActionFn;
    updatePost: ServerActionFn;
    deletePost: ServerActionFn;
    updateArticle: ServerActionFn;
    deleteArticle: ServerActionFn;
    updateForumComment: ServerActionFn;
    deleteForumComment: ServerActionFn;
    updateNewsComment: ServerActionFn;
    deleteNewsComment: ServerActionFn;
}
