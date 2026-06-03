import { unstable_cache } from 'next/cache'
import { pbList } from '@/server/directus/pb-helpers'
import { mediaUrl } from '@/lib/media-url'
import { TABLES } from '@/server/directus/tables'
import PubliciteClient, { type Partner } from './publicite-client'

async function fetchPartners(): Promise<Partner[]> {
  try {
    // En cas d'erreur réseau / DB : liste vide. L'état vide est géré côté
    // client (PubliciteClient) avec un message propre.
    const rows = await pbList<{ name: string; link: string; image: string }>(TABLES.sponsors, {
      fields: 'id,name,link,image,active',
      sort: '-created',
      perPage: 20,
      filter: { active: { _eq: true } },
    })

    return rows
      .map((row) => ({
        name: String(row?.name || '').trim(),
        banner: mediaUrl(row?.image || ''),
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
