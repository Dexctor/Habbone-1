import { notFound } from 'next/navigation';

/**
 * Legacy route. `forum_posts` was a Directus-only collection that did not
 * survive the Supabase migration. Nothing in the app links to this page
 * anymore, so we serve a 404 instead of breaking the build.
 */
export default function PostPage() {
  notFound();
}
