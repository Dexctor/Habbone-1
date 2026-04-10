'use client'

import { useMemo, useState } from 'react'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ShopCategory = 'Pack' | 'Badge' | 'VIP' | 'Bonus'

type ShopItem = {
  id: number
  name: string
  price: number
  category: ShopCategory
  image: string
  stock: number
  disabled?: boolean
}

/* ------------------------------------------------------------------ */
/*  Données statiques (à remplacer par un fetch Directus)              */
/* ------------------------------------------------------------------ */

const SHOP_ITEMS: ShopItem[] = [
  { id: 1, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 20 },
  { id: 2, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 20 },
  { id: 3, name: 'Totem de Diamante', price: 350, category: 'Badge', image: '/img/box.png', stock: 20 },
  { id: 4, name: 'Totem de Diamante', price: 350, category: 'VIP', image: '/img/box.png', stock: 20 },
  { id: 5, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 20 },
  { id: 6, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 20 },
  { id: 7, name: 'Totem de Diamante', price: 350, category: 'Badge', image: '/img/box.png', stock: 20 },
  { id: 8, name: 'Totem de Diamante', price: 350, category: 'Bonus', image: '/img/box.png', stock: 20 },
  { id: 9, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 0, disabled: true },
  { id: 10, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 0, disabled: true },
  { id: 11, name: 'Totem de Diamante', price: 350, category: 'Badge', image: '/img/box.png', stock: 0, disabled: true },
  { id: 12, name: 'Totem de Diamante', price: 350, category: 'VIP', image: '/img/box.png', stock: 0, disabled: true },
  { id: 13, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 0, disabled: true },
  { id: 14, name: 'Totem de Diamante', price: 350, category: 'Pack', image: '/img/box.png', stock: 0, disabled: true },
  { id: 15, name: 'Totem de Diamante', price: 350, category: 'Badge', image: '/img/box.png', stock: 0, disabled: true },
  { id: 16, name: 'Totem de Diamante', price: 350, category: 'Bonus', image: '/img/box.png', stock: 0, disabled: true },
]

const PAGE_SIZE = 12

/* ------------------------------------------------------------------ */
/*  Composants                                                         */
/* ------------------------------------------------------------------ */

function ShopCard({ item }: { item: ShopItem }) {
  const soldOut = item.stock <= 0 || Boolean(item.disabled)

  return (
    <article className="flex flex-col rounded-[8px] bg-[#1F1F3E] border border-[#141433] overflow-hidden">
      {/* Image en haut */}
      <div className="flex h-[140px] items-center justify-center bg-[#303060]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image}
          alt={item.name}
          className="h-[100px] w-auto object-contain image-pixelated"
          loading="lazy"
        />
      </div>

      {/* Contenu en bas */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        {/* Nom du produit */}
        <h2 className="text-[15px] font-bold uppercase leading-snug text-white">
          {item.name}
        </h2>

        {/* Prix */}
        <div className="flex items-center gap-2 rounded-[4px] border-2 border-white/10 bg-black/10 px-3 py-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/icon-coin.png" alt="" className="h-[22px] w-[22px] image-pixelated" />
          <span className="text-[14px] font-bold text-[#DDD]">{item.price}</span>
        </div>

        {/* Bouton Acheter */}
        <button
          type="button"
          disabled={soldOut}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide transition ${
            soldOut
              ? 'cursor-not-allowed border-2 border-white/10 bg-transparent text-[#BEBECE]'
              : 'bg-[#2596FF] text-white hover:bg-[#2976E8]'
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
          {soldOut ? 'Indisponible' : 'Acheter'}
        </button>
      </div>
    </article>
  )
}

function Pagination({
  page,
  pageCount,
  onPageChange,
}: {
  page: number
  pageCount: number
  onPageChange: (p: number) => void
}) {
  if (pageCount <= 1) return null

  return (
    <nav
      className="flex items-center justify-center gap-4 py-3"
      aria-label="Pagination de la boutique"
    >
      {/* Précédent */}
      <button
        type="button"
        onClick={() => onPageChange(Math.max(0, page - 1))}
        disabled={page === 0}
        className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page précédente"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Numéros de page */}
      <div className="flex items-center gap-2">
        {Array.from({ length: pageCount }, (_, index) => {
          const isActive = index === page
          return (
            <button
              key={index}
              type="button"
              onClick={() => onPageChange(index)}
              className={`px-2 py-1 text-[16px] font-normal transition ${
                isActive ? 'text-white underline' : 'text-[#DDD] hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
              aria-label={`Page ${index + 1}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>

      {/* Suivant */}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
        disabled={page >= pageCount - 1}
        className="grid h-[30px] w-[30px] place-items-center rounded-[4px] bg-white/5 text-[#DDD] transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Page suivante"
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
      </button>
    </nav>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BoutiquePage() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  /* Filtrage par recherche */
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return SHOP_ITEMS
    return SHOP_ITEMS.filter((item) => item.name.toLowerCase().includes(term))
  }, [query])

  /* Pagination */
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* ── En-tête : titre + recherche ── */}
      <div className="flex flex-col gap-4 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/store.png" alt="" className="h-[45px] w-auto image-pixelated" />
          <h1 className="text-[18px] font-bold uppercase tracking-[0.04em] text-[#DDD]">
            Boutique
          </h1>
        </div>

        {/* Barre de recherche */}
        <div className="relative w-full sm:w-[255px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#BEBECE]">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder="Rechercher par nom"
            className="h-[50px] w-full rounded-[3px] bg-white/10 pl-10 pr-3 text-[14px] font-normal text-[#DDD] placeholder:text-[#BEBECE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/40"
          />
        </div>
      </div>

      {/* ── Grille de produits ── */}
      <section>
        {visible.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#141433] bg-[#272746] px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
            Aucun article trouvé.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <ShopCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* ── Pagination ── */}
      <Pagination page={clampedPage} pageCount={pageCount} onPageChange={setPage} />
    </main>
  )
}
