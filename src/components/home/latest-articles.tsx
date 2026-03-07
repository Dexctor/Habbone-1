import { listPublicNewsForCards } from "@/server/directus/news"
import LatestArticlesClient from "./latest-articles-client"

export default async function LatestArticles() {
  const items = await listPublicNewsForCards(60).catch(() => []) as any[]
  // Normalize minimal shape
  const data = Array.isArray(items)
    ? items.map((n: any) => ({ id: Number(n.id), titulo: n.titulo, descricao: n.descricao ?? null, imagem: n.imagem ?? null }))
    : []
  return <LatestArticlesClient items={data} />
}
