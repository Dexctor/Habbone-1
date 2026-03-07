import { getPublicTopics } from '@/server/directus/forum'
import ForumTopicsClient from './forum-topics-client'

export default async function ForumTopics() {
    const topics = await getPublicTopics(6).catch(() => []) as any[]
    const data = Array.isArray(topics)
        ? topics.map((t: any) => ({
            id: Number(t.id),
            titulo: t.titulo || '',
            autor: t.autor || '',
            views: t.views ?? 0,
            data: t.data || null,
            imagem: t.imagem || null,
        }))
        : []
    return <ForumTopicsClient topics={data} />
}
