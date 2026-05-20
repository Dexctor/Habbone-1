import { unstable_cache } from 'next/cache'
import { listSponsors } from '@/server/directus/sponsors'
import PubliciteClient, { type Partner } from './publicite-client'

async function fetchPartners(): Promise<Partner[]> {
  try {
    const sponsors = await listSponsors(20)
    return sponsors
      .filter((sponsor) => sponsor.status === 'ativo')
      .map((sponsor) => ({
        name: sponsor.nome,
        banner: sponsor.imagem,
        href: sponsor.link || '#',
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
