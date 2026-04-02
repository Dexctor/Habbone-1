import { directusUrl, serviceToken } from '@/server/directus/client'
import { mediaUrl } from '@/lib/media-url'
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
    const url = new URL(`${directusUrl}/items/parceiros`)
    url.searchParams.set('fields', 'id,nome,link,imagem,status')
    url.searchParams.set('sort', '-id')
    url.searchParams.set('limit', '20')
    url.searchParams.set('filter[status][_eq]', 'ativo')
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
        name: String(row?.nome || '').trim(),
        banner: mediaUrl(row?.imagem || ''),
        href: String(row?.link || '#').trim(),
      }))
      .filter((p) => p.name && p.banner)
  } catch {
    return FALLBACK_PARTNERS
  }
}

export default async function Publicite() {
  const partners = await fetchPartners()
  return <PubliciteClient partners={partners} />
}
