import { unstable_cache } from "next/cache"
import { listPublicNewsForCards } from "@/server/directus/news"
import LatestArticlesClient from "./latest-articles-client"

const getCachedNews = unstable_cache(
  () => listPublicNewsForCards(60).catch(() => []),
  ['home-news-cards'],
  { tags: ['news', 'home'], revalidate: 300 }
)

export default async function LatestArticles() {
  const items = await getCachedNews()
  // Normalize minimal shape
  const data = Array.isArray(items)
    ? items.map((n) => ({ id: String(n.id ?? ''), titulo: n.titulo, descricao: n.descricao ?? null, imagem: n.imagem ?? null }))
    : []
  return <LatestArticlesClient items={data} />
}
