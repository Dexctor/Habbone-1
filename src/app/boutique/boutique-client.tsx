'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import type { ShopItem } from '@/types/shop'

const PAGE_SIZE = 12

/* ------------------------------------------------------------------ */
/*  Composants                                                         */
/* ------------------------------------------------------------------ */

function ShopCard({
  item,
  coins,
  loggedIn,
  onBuy,
  buying,
}: {
  item: ShopItem
  coins: number
  loggedIn: boolean
  onBuy: (id: number) => void
  buying: number | null
}) {
  const soldOut = item.estoque <= 0
  const cantAfford = coins < item.preco
  const isBuying = buying === item.id
  const disabled = soldOut || !loggedIn || cantAfford || isBuying

  return (
    <article className="flex flex-col rounded-[8px] bg-[#1F1F3E] border border-[#141433] overflow-hidden">
      {/* Image */}
      <div className="flex h-[140px] items-center justify-center bg-[#303060]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.imagem}
          alt={item.nome}
          className="h-[100px] w-auto object-contain image-pixelated"
          loading="lazy"
          onError={(e) => { (e.target as HTMLImageElement).src = '/img/box.png' }}
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h2 className="text-[15px] font-bold uppercase leading-snug text-white">
          {item.nome}
        </h2>
        {item.descricao && (
          <p className="text-[12px] text-[#BEBECE]/60 line-clamp-2">{item.descricao}</p>
        )}

        {/* Prix */}
        <div className="flex items-center gap-2 rounded-[4px] border-2 border-white/10 bg-black/10 px-3 py-2 w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/icon-coin.png" alt="" className="h-[22px] w-[22px] image-pixelated" />
          <span className="text-[14px] font-bold text-[#DDD]">{item.preco}</span>
        </div>

        {soldOut && (
          <span className="text-[11px] font-bold uppercase text-[#F92330]">Rupture de stock</span>
        )}

        {/* Bouton Acheter */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onBuy(item.id)}
          className={`mt-auto flex w-full items-center justify-center gap-2 rounded-[4px] px-4 py-2.5 text-[13px] font-bold uppercase tracking-wide transition ${
            disabled
              ? 'cursor-not-allowed border-2 border-white/10 bg-transparent text-[#BEBECE]'
              : 'bg-[#2596FF] text-white hover:bg-[#2976E8]'
          }`}
        >
          <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
          {isBuying ? 'Achat en cours...' : soldOut ? 'Indisponible' : !loggedIn ? 'Connecte-toi' : cantAfford ? 'Coins insuffisants' : 'Acheter'}
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
    <nav className="flex items-center justify-center gap-4 py-3" aria-label="Pagination de la boutique">
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
      <div className="flex items-center gap-2">
        {Array.from({ length: pageCount }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onPageChange(index)}
            className={`px-2 py-1 text-[16px] font-normal transition ${
              index === page ? 'text-white underline' : 'text-[#DDD] hover:text-white'
            }`}
            aria-current={index === page ? 'page' : undefined}
            aria-label={`Page ${index + 1}`}
          >
            {index + 1}
          </button>
        ))}
      </div>
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
/*  Page Client                                                        */
/* ------------------------------------------------------------------ */

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

export default function BoutiqueClient({
  initialItems,
  initialCoins,
  loggedIn,
}: {
  initialItems: ShopItem[]
  initialCoins: number
  loggedIn: boolean
}) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 250)
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<ShopItem[]>(initialItems)
  const [coins, setCoins] = useState(initialCoins)
  const [buying, setBuying] = useState<number | null>(null)
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null)

  // Purchase execution (called after dialog confirm)
  const executePurchase = useCallback(async (item: ShopItem) => {
    setBuying(item.id)
    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur')

      toast.success(json.message || 'Achat effectué !')
      const newBalance = coins - item.preco
      setCoins(newBalance)

      // Broadcast the new balance so the header + any other component
      // showing coins updates live without waiting for its cache to expire.
      try {
        window.dispatchEvent(new CustomEvent('habbone:coins', { detail: { balance: newBalance } }))
      } catch { /* SSR noop */ }

      // Refresh items to update stock
      const refreshRes = await fetch('/api/shop/items', { cache: 'no-store' })
      const refreshJson = await refreshRes.json()
      if (refreshJson?.data) setItems(refreshJson.data)
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'achat')
    } finally {
      setBuying(null)
    }
  }, [coins])

  // Open confirm dialog
  const handleBuy = useCallback((itemId: number) => {
    if (!loggedIn) {
      toast.error('Connecte-toi pour acheter')
      return
    }
    const item = items.find((i) => i.id === itemId)
    if (!item) return
    setConfirmItem(item)
  }, [loggedIn, items])

  /* Filtrage (avec debounce) */
  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase()
    if (!term) return items
    return items.filter((item) => item.nome.toLowerCase().includes(term))
  }, [debouncedQuery, items])

  /* Pagination */
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      {/* En-tête */}
      <div className="flex flex-col gap-4 rounded-[4px] border border-[#141433] bg-[#1F1F3E] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/store.png" alt="" className="h-[45px] w-auto image-pixelated" />
          <div>
            <h1 className="text-[18px] font-bold uppercase tracking-[0.04em] text-[#DDD]">
              Boutique
            </h1>
            {loggedIn && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/img/icon-coin.png" alt="" className="h-[16px] w-[16px] image-pixelated" />
                <span className="text-[13px] font-bold text-[#FFC800]">{coins.toLocaleString('fr-FR')}</span>
                <span className="text-[11px] text-[#BEBECE]/50">coins</span>
              </div>
            )}
          </div>
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
            onChange={(e) => { setQuery(e.target.value); setPage(0) }}
            placeholder="Rechercher par nom"
            className="h-[50px] w-full rounded-[3px] bg-white/10 pl-10 pr-3 text-[14px] font-normal text-[#DDD] placeholder:text-[#BEBECE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2596FF]/40"
          />
        </div>
      </div>

      {/* Grille */}
      <section>
        {visible.length === 0 ? (
          <div className="rounded-[4px] border border-dashed border-[#141433] bg-[#272746] px-6 py-14 text-center text-sm font-semibold uppercase tracking-[0.08em] text-[#BEBECE]/70">
            Aucun article trouvé.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <ShopCard
                key={item.id}
                item={item}
                coins={coins}
                loggedIn={loggedIn}
                onBuy={handleBuy}
                buying={buying}
              />
            ))}
          </div>
        )}
      </section>

      {/* Pagination */}
      <Pagination page={clampedPage} pageCount={pageCount} onPageChange={setPage} />

      {/* Dialog de confirmation d'achat */}
      <Dialog open={!!confirmItem} onOpenChange={(open) => { if (!open) setConfirmItem(null) }}>
        <DialogContent className="border-[#141433] bg-[#1F1F3E] text-white sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[16px] font-bold uppercase tracking-wide text-[#DDD]">
              Confirmer l&apos;achat
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#BEBECE]">
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>

          {confirmItem && (
            <div className="flex items-center gap-4 rounded-[6px] border border-white/10 bg-[#272746] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={confirmItem.imagem}
                alt={confirmItem.nome}
                className="h-[60px] w-[60px] object-contain image-pixelated"
                onError={(e) => { (e.target as HTMLImageElement).src = '/img/box.png' }}
              />
              <div className="flex-1">
                <p className="text-[14px] font-bold text-white">{confirmItem.nome}</p>
                <div className="mt-1 flex items-center gap-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/img/icon-coin.png" alt="" className="h-[18px] w-[18px] image-pixelated" />
                  <span className="text-[14px] font-bold text-[#FFC800]">{confirmItem.preco}</span>
                  <span className="text-[11px] text-[#BEBECE]/60">coins</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-[4px] border-2 border-white/10 bg-transparent px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-[#BEBECE] transition hover:bg-white/5"
              >
                Annuler
              </button>
            </DialogClose>
            <button
              type="button"
              disabled={buying !== null}
              onClick={() => {
                if (confirmItem) {
                  setConfirmItem(null)
                  executePurchase(confirmItem)
                }
              }}
              className="rounded-[4px] bg-[#2596FF] px-5 py-2.5 text-[13px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2976E8] disabled:opacity-50"
            >
              {buying !== null ? 'Achat en cours...' : 'Confirmer'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
