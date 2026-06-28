import { unstable_cache } from 'next/cache'
import { getPublicTopics } from '@/server/pocketbase/forum'
import ForumTopicsClient from './forum-topics-client'

const getCachedTopics = unstable_cache(
  () => getPublicTopics(7).catch(() => []),
  ['home-forum-topics'],
  { tags: ['forum', 'home'], revalidate: 300 }
)

export default async function ForumTopics() {
    const topics = await getCachedTopics()
    const data = Array.isArray(topics)
        ? topics.map((t) => ({
            id: String(t.id ?? ''),
            titulo: t.titulo || '',
            autor: t.autor || '',
            views: t.views ?? 0,
            data: t.data || null,
            imagem: t.imagem || null,
        }))
        : []
    return <ForumTopicsClient topics={data} />
}
