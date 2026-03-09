'use client'

import Link from 'next/link'
import { useState } from 'react'

type Partner = {
  name: string
  banner: string
  href: string
}

const PARTNERS: Partner[] = [
  {
    name: 'Kihabbo, un monde different',
    banner: '/img/partenaire.png',
    href: 'https://discord.gg/zCFvdHsAry',
  },
  {
    name: 'Habboneco, communaute officielle',
    banner: '/img/partenaire.png',
    href: 'https://discord.gg/s4NpDcgcWe',
  },
]

export default function Publicite() {
  const [index, setIndex] = useState(0)

  const activePartner = PARTNERS[index]
  const canMove = PARTNERS.length > 1

  const showPrevious = () => {
    setIndex((current) => (current - 1 + PARTNERS.length) % PARTNERS.length)
  }

  const showNext = () => {
    setIndex((current) => (current + 1) % PARTNERS.length)
  }

  return (
    <section className="w-full">
      <div className="overflow-hidden rounded-[4px] border border-[#1F1F3E] bg-[#272746]">
        <header className="flex h-[50px] items-center justify-between px-0">
          <div className="flex items-center gap-3 pl-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/img/contact.png" alt="" className="h-[34px] w-auto image-pixelated" />
            <h2 className="text-[18px] font-bold uppercase text-[#DDD] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              Publicite
            </h2>
          </div>

          <div className="flex items-center gap-4 pr-0 sm:pr-5">
            <Link
              href="/partenaires"
              className="hidden h-[50px] items-center rounded-[4px] bg-[rgba(255,255,255,0.1)] px-[20px] text-[11px] font-bold uppercase tracking-[0.04em] text-[#DDD] transition hover:bg-[rgba(255,255,255,0.16)] sm:inline-flex"
            >
              Devenir partenaire
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Publicite precedente"
                onClick={showPrevious}
                disabled={!canMove}
                className="grid h-[50px] w-[50px] place-items-center rounded-[4px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[#2596FF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="material-icons text-[22px]" aria-hidden>
                  chevron_left
                </i>
              </button>
              <button
                type="button"
                aria-label="Publicite suivante"
                onClick={showNext}
                disabled={!canMove}
                className="grid h-[50px] w-[50px] place-items-center rounded-[4px] bg-[rgba(255,255,255,0.1)] text-[#DDD] transition hover:bg-[#2596FF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="material-icons text-[22px]" aria-hidden>
                  chevron_right
                </i>
              </button>
            </div>
          </div>
        </header>

        <Link
          href={activePartner.href}
          target="_blank"
          rel="noreferrer"
          className="relative block h-[242px] overflow-hidden rounded-[4px] border-t border-white/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={activePartner.banner} alt={activePartner.name} className="h-full w-full object-cover" />
          <div className="absolute inset-0 shadow-[inset_0_0_0_3px_rgba(255,255,255,0.2)]" />
          <div className="absolute bottom-[14px] right-[14px] rounded-[4px] bg-[rgba(20,20,51,0.85)] px-[10px] py-[10px] text-[13px] font-bold text-white backdrop-blur-[25px]">
            {activePartner.name}
          </div>
        </Link>
      </div>
    </section>
  )
}
