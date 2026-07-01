import { listPseudoChanges } from '@/server/pocketbase/pseudo-changes'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import PseudoChangesClient from './pseudo-changes-client'
import { SiteHeader, SitePage, SitePanel } from '@/components/site'

export const revalidate = 60

type PseudoChange = {
  id: string
  oldNick: string
  newNick: string
  hotel: string
  changedAt: number
  avatarUrl: string
}

const HOTEL_CODES = ['fr', 'com', 'com.br', 'nl', 'de', 'it', 'fi', 'es', 'com.tr'] as const

async function fetchChanges(hotel?: string): Promise<{ changes: PseudoChange[]; total: number }> {
  const res = await listPseudoChanges({
    hotel: hotel && hotel !== 'all' ? hotel : undefined,
    limit: 100,
    page: 1,
  })

  const changes: PseudoChange[] = res.data.map((row) => ({
    id: row.id,
    oldNick: row.old_nick,
    newNick: row.new_nick,
    hotel: row.hotel,
    changedAt: Number(row.changed_at) || 0,
    avatarUrl: buildHabboAvatarUrl(row.new_nick, {
      direction: 2,
      head_direction: 3,
      img_format: 'png',
      gesture: 'sml',
      headonly: 1,
      size: 'l',
    }),
  }))

  return { changes, total: res.total }
}

export default async function PseudoHabboPage({
  searchParams,
}: {
  searchParams: Promise<{ hotel?: string }>
}) {
  const params = await searchParams
  const hotel = params?.hotel && HOTEL_CODES.includes(params.hotel as any) ? params.hotel : 'all'
  const { changes, total } = await fetchChanges(hotel)

  return (
    <SitePage width="lg">
      <SiteHeader title="Changements de pseudo Habbo" eyebrow="Extra" imageSrc="/img/info.png" />

      <SitePanel className="space-y-2 px-5 py-4">
        <p className="text-sm leading-relaxed text-[#BEBECE]">
          Depuis décembre 2022, les joueurs Habbo peuvent changer leur pseudo.
          Cette page recense les derniers changements détectés par HabbOne.
        </p>
        <p className="text-xs leading-relaxed text-[#BEBECE]/70">
          Les changements sont détectés lors des connexions à HabbOne et des consultations de profils.
          Seuls les profils ouverts (non bannis) sont suivis.
        </p>
      </SitePanel>

      <PseudoChangesClient
        initialChanges={changes}
        initialHotel={hotel}
        initialTotal={total}
        hotelCodes={HOTEL_CODES as unknown as string[]}
      />
    </SitePage>
  )
}
