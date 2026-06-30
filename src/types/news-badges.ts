export type NewsBadgeItem = {
  newsId: string;
  title: string;
  badgeCode: string;
  badgeAlbum?: string | null;
  badgeImageUrl: string;
  articleUrl: string;
  publishedAt: string | null;
};
