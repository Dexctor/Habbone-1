import { NextResponse } from 'next/server';
import { withAdmin } from '@/server/api-helpers';
import { getAdminUserHistory } from '@/server/directus/admin-user-history';

export const GET = withAdmin(async (_req, { params }) => {
  try {
    const userId = params?.id;
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const history = await getAdminUserHistory(userId);

    return NextResponse.json({
      data: history,
      stats: {
        topics: history.topics.length,
        articles: history.articles.length,
        forumComments: history.forumComments.length,
        newsComments: history.newsComments.length,
        sanctions: 0,
      },
    });
  } catch (error) {
    console.error('[API] User history error:', error);
    return NextResponse.json({ error: 'Failed to fetch user history' }, { status: 500 });
  }
});
