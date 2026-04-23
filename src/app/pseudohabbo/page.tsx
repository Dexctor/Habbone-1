import { listPseudoChanges } from '@/server/directus/pseudo-changes'
import { buildHabboAvatarUrl } from '@/lib/habbo-imaging'
import PseudoChangesClient from './pseudo-changes-client'

export const revalidate = 60

type PseudoChange = {
  id: number
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
    <main className="mx-auto w-full max-w-[1000px] space-y-6 px-4 py-10 sm:px-6">
      {/* Header */}
      <header className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] p-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/info.png" alt="" className="h-[43px] w-auto image-pixelated" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#BEBECE]">
              Extra
            </p>
            <h1 className="text-lg font-bold uppercase tracking-[0.08em] text-[#DDD]">
              Changements de pseudo Habbo
            </h1>
          </div>
        </div>
      </header>

      {/* Info */}
      <section className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-5 py-4 space-y-2">
        <p className="text-sm leading-relaxed text-[#BEBECE]">
          Depuis décembre 2022, les joueurs Habbo peuvent changer leur pseudo.
          Cette page recense les derniers changements détectés par HabbOne.
        </p>
        <p className="text-xs leading-relaxed text-[#BEBECE]/70">
          Les changements sont détectés lors des connexions à HabbOne et des consultations de profils.
          Seuls les profils ouverts (non bannis) sont suivis.
        </p>
      </section>

      {/* Tabs hotel + list (client) */}
      <PseudoChangesClient
        initialChanges={changes}
        initialHotel={hotel}
        initialTotal={total}
        hotelCodes={HOTEL_CODES as unknown as string[]}
      />
    </main>
  )
}
