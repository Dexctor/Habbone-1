import { unstable_cache } from 'next/cache'
import { directusUrl, serviceToken } from '@/server/directus/client'
import { mediaUrl } from '@/lib/media-url'
import { TABLES, USE_V2 } from '@/server/directus/tables'
import PubliciteClient, { type Partner } from './publicite-client'

const FALLBACK_PARTNERS: Partner[] = [
  {
    name: 'Kihabbo, un monde different',
    banner: '/uploads/news-a182f4b65f.png',
    href: 'https://discord.gg/zCFvdHsAry',
  },
]

async function fetchPartners(): Promise<Partner[]> {
  try {
    const fields = USE_V2 ? 'id,name,link,image,active' : 'id,nome,link,imagem,status'
    const filterField = USE_V2 ? 'active' : 'status'
    const filterValue = USE_V2 ? 'true' : 'ativo'
    const filterOp = USE_V2 ? '_eq' : '_eq'

    const url = new URL(`${directusUrl}/items/${encodeURIComponent(TABLES.sponsors)}`)
    url.searchParams.set('fields', fields)
    url.searchParams.set('sort', '-id')
    url.searchParams.set('limit', '20')
    url.searchParams.set(`filter[${filterField}][${filterOp}]`, filterValue)
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${serviceToken}` },
      cache: 'no-store',
    })
    if (!res.ok) return FALLBACK_PARTNERS
    const json = await res.json()
    const rows = json?.data ?? []

    if (!Array.isArray(rows) || rows.length === 0) return FALLBACK_PARTNERS

    return rows
      .map((row: any) => ({
        name: String((USE_V2 ? row?.name : row?.nome) || '').trim(),
        banner: mediaUrl((USE_V2 ? row?.image : row?.imagem) || ''),
        href: String(row?.link || '#').trim(),
      }))
      .filter((p) => p.name && p.banner)
  } catch {
    return FALLBACK_PARTNERS
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
