'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'

type PseudoChange = {
  id: number
  oldNick: string
  newNick: string
  hotel: string
  changedAt: number
  avatarUrl: string
}

type Props = {
  initialChanges: PseudoChange[]
  initialHotel: string
  initialTotal: number
  hotelCodes: string[]
}

const HOTEL_LABEL: Record<string, string> = {
  fr: 'FR',
  com: 'COM',
  'com.br': 'BR',
  nl: 'NL',
  de: 'DE',
  it: 'IT',
  fi: 'FI',
  es: 'ES',
  'com.tr': 'TR',
}

function formatRelative(unixSeconds: number): string {
  if (!unixSeconds) return 'Date inconnue'
  const now = Math.floor(Date.now() / 1000)
  const diff = now - unixSeconds
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)} h`
  if (diff < 86400 * 7) return `il y a ${Math.floor(diff / 86400)} j`
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(unixSeconds * 1000))
  } catch {
    return 'Date inconnue'
  }
}

export default function PseudoChangesClient({ initialChanges, initialHotel, initialTotal, hotelCodes }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const changeHotel = (hotel: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (hotel === 'all') params.delete('hotel')
    else params.set('hotel', hotel)
    const qs = params.toString()
    startTransition(() => {
      router.push(`/pseudohabbo${qs ? `?${qs}` : ''}`)
    })
  }

  return (
    <>
      {/* Hotel filter tabs */}
      <div className="rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => changeHotel('all')}
            disabled={isPending}
            className={`h-[34px] rounded-[3px] px-3 text-[11px] font-bold uppercase tracking-[0.06em] transition disabled:opacity-50 ${
              initialHotel === 'all'
                ? 'bg-[#2596FF] text-white'
                : 'bg-[rgba(255,255,255,0.08)] text-[#DDD] hover:bg-[rgba(255,255,255,0.16)]'
            }`}
          >
            Tous
          </button>
          {hotelCodes.map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => changeHotel(code)}
              disabled={isPending}
              className={`h-[34px] min-w-[48px] rounded-[3px] px-3 text-[11px] font-bold uppercase tracking-[0.06em] transition disabled:opacity-50 ${
                initialHotel === code
                  ? 'bg-[#2596FF] text-white'
                  : 'bg-[rgba(255,255,255,0.08)] text-[#DDD] hover:bg-[rgba(255,255,255,0.16)]'
              }`}
            >
              {HOTEL_LABEL[code] || code.toUpperCase()}
            </button>
          ))}
          <span className="ml-auto text-[11px] text-[#BEBECE]/70">
            {initialTotal} {initialTotal > 1 ? 'changements' : 'changement'}
          </span>
        </div>
      </div>

      {/* Changes list */}
      <section className={`space-y-2 transition-opacity ${isPending ? 'opacity-50' : 'opacity-100'}`}>
        {initialChanges.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#1F1F3E] bg-[#272746] px-6 py-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
              Aucun changement détecté
            </p>
            <p className="mt-2 text-xs text-[#BEBECE]/50">
              {initialHotel === 'all'
                ? 'Le tracker est en cours d\'alimentation. Les changements apparaîtront ici dès qu\'ils seront détectés.'
                : `Aucun changement sur ${HOTEL_LABEL[initialHotel] || initialHotel.toUpperCase()} pour le moment.`}
            </p>
          </div>
        ) : (
          initialChanges.map((change) => (
            <article
              key={change.id}
              className="flex items-center gap-4 rounded-[4px] border border-[#1F1F3E] bg-[#272746] px-4 py-3 transition hover:border-white/10 hover:bg-[#303060]"
            >
              {/* Avatar */}
              <div className="grid h-[56px] w-[56px] shrink-0 place-items-center overflow-hidden rounded-[3px] bg-[#1F1F3E]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={change.avatarUrl}
                  alt={change.newNick}
                  className="image-pixelated h-auto max-h-[50px] w-auto"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              </div>

              {/* Names */}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-[14px]">
                  <span className="font-bold text-[#F92330] line-through">{change.oldNick}</span>
                  <span className="text-[#BEBECE]">→</span>
                  <span className="font-bold text-[#0FD52F]">{change.newNick}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#BEBECE]">
                  <span className="rounded-[2px] bg-[#1F1F3E] px-2 py-0.5 text-[11px] font-bold">
                    {HOTEL_LABEL[change.hotel] || change.hotel.toUpperCase()}
                  </span>
                  <span>{formatRelative(change.changedAt)}</span>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </>
  )
}
