import { unstable_cache } from 'next/cache'
import { directusUrl, serviceToken } from '@/server/directus/client'
import { mediaUrl } from '@/lib/media-url'
import { TABLES, USE_V2 } from '@/server/directus/tables'
import PubliciteClient, { type Partner } from './publicite-client'

async function fetchPartners(): Promise<Partner[]> {
  try {
    const fields = USE_V2 ? 'id,name,link,image,active' : 'id,nome,link,imagem,status'
    const filterField = USE_V2 ? 'active' : 'status'
    const filterValue = USE_V2 ? 'true' : 'ativo'

    const url = new URL(`${directusUrl}/items/${encodeURIComponent(TABLES.sponsors)}`)
    url.searchParams.set('fields', fields)
    url.searchParams.set('sort', '-id')
    url.searchParams.set('limit', '20')
    url.searchParams.set(`filter[${filterField}][_eq]`, filterValue)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    })
    // En cas d'erreur réseau / DB : on retourne une liste vide. L'état
    // vide est géré côté client (PubliciteClient) avec un message propre.
    if (!res.ok) return []
    const json = await res.json()
    const rows = json?.data ?? []
    if (!Array.isArray(rows)) return []

    return rows
      .map((row: any) => ({
        name: String((USE_V2 ? row?.name : row?.nome) || '').trim(),
        banner: mediaUrl((USE_V2 ? row?.image : row?.imagem) || ''),
        href: String(row?.link || '#').trim(),
      }))
      .filter((p) => p.name && p.banner)
  } catch {
    return []
  }
}

// Cache avec tag 'pub' pour pouvoir invalider depuis /api/admin/pub
// (revalidateTag('pub')) sans attendre l'expiration de revalidate=300.
const getCachedPartners = unstable_cache(
  fetchPartners,
  ['publicite-partners'],
  { tags: ['pub', 'home'], revalidate: 300 },
)

export default async function Publicite() {
  const partners = await getCachedPartners()
  return <PubliciteClient partners={partners} />
}
