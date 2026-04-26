'use client'

import Link from 'next/link'
import { Megaphone } from 'lucide-react'
import { useState } from 'react'

export type Partner = {
  name: string
  banner: string
  href: string
}

export default function PubliciteClient({ partners }: { partners: Partner[] }) {
  const [index, setIndex] = useState(0)
  const isEmpty = partners.length === 0

  const activePartner = isEmpty ? null : partners[index % partners.length]
  const canMove = partners.length > 1

  const showPrevious = () => {
    setIndex((current) => (current - 1 + partners.length) % partners.length)
  }

  const showNext = () => {
    setIndex((current) => (current + 1) % partners.length)
  }

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] shrink-0 items-center justify-between border-b border-[#34345A] bg-[rgba(0,0,0,0.1)] px-5">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/contact.png" alt="" className="h-[28px] w-auto image-pixelated" />
            <h2 className="text-[14px] font-bold uppercase text-white">
              Publicité
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/partenaires"
              className="hidden h-[36px] items-center rounded-[3px] bg-[rgba(255,255,255,0.08)] px-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)] sm:inline-flex"
            >
              Partenaires
            </Link>
            {/* Flèches : masquées quand il n'y a rien à naviguer (vide ou un seul partenaire). */}
            {!isEmpty && (
              <>
                <button
                  type="button"
                  aria-label="Publicité précédente"
                  onClick={showPrevious}
                  disabled={!canMove}
                  className="grid h-[36px] w-[36px] place-items-center rounded-[3px] bg-[rgba(255,255,255,0.08)] text-[#DDD] transition hover:bg-[#2596FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="material-icons text-[18px]" aria-hidden>chevron_left</i>
                </button>
                <button
                  type="button"
                  aria-label="Publicité suivante"
                  onClick={showNext}
                  disabled={!canMove}
                  className="grid h-[36px] w-[36px] place-items-center rounded-[3px] bg-[rgba(255,255,255,0.08)] text-[#DDD] transition hover:bg-[#2596FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <i className="material-icons text-[18px]" aria-hidden>chevron_right</i>
                </button>
              </>
            )}
          </div>
        </header>

        {isEmpty ? (
          // État vide : même hauteur visuelle qu'une bannière pub pour ne
          // pas casser le rythme de la home, fond gradient discret, message
          // friendly. Pas de CTA pour rester neutre.
          <div className="flex min-h-[160px] flex-col items-center justify-center gap-3 bg-gradient-to-br from-[#1F1F3E] via-[#25254D] to-[#303060] px-6 py-8 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[rgba(255,255,255,0.06)]">
              <Megaphone className="h-5 w-5 text-[#BEBECE]" aria-hidden />
            </div>
            <p className="text-[13px] font-bold text-[#DDD]">
              Aucun partenaire pour le moment
            </p>
            <p className="max-w-[320px] text-[11px] leading-relaxed text-[#BEBECE]/70">
              Les bannières de nos partenaires apparaîtront ici dès qu&apos;elles
              seront ajoutées.
            </p>
          </div>
        ) : (
          <div className="p-4">
            <Link
              href={activePartner!.href}
              target="_blank"
              rel="noreferrer"
              className="relative block overflow-hidden rounded-[4px]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activePartner!.banner}
                alt={activePartner!.name}
                className="w-full object-cover"
              />
              <div className="absolute inset-0 rounded-[4px] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.08)]" />
              <div className="absolute bottom-[10px] right-[10px] rounded-[4px] bg-[rgba(20,20,51,0.85)] px-[10px] py-[8px] text-[12px] font-bold text-white backdrop-blur-[25px]">
                {activePartner!.name}
              </div>
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
