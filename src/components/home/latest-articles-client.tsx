"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { mediaUrl } from "@/lib/media-url"

type Item = { id: number; titulo: string; descricao?: string | null; imagem?: string | null }

export default function LatestArticlesClient({ items }: { items: Item[] }) {
  const [q, setQ] = useState("")
  const [page, setPage] = useState(0)
  const reduce = useReducedMotion()
  const pageSize = 6

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return items
    return items.filter((n) => (n.titulo || "").toLowerCase().includes(term))
  }, [items, q])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const clampedPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(clampedPage * pageSize, clampedPage * pageSize + pageSize)

  const prev = () => setPage((p) => Math.max(0, p - 1))
  const next = () => setPage((p) => Math.min(pageCount - 1, p + 1))

  // Wrappers (UI expects these names but keep same logic)
  const onSearch = (_section: number) => setPage(0)
  const onArrows = (_section: number, dir: 0 | 1) => (dir === 0 ? prev() : next())

  return (
    <section className="w-full articles">
      {/* Barre titre + recherche + flèches */}
      <div className="bar-default flex flex-col items-start md:flex-row md:items-center justify-between w-full min-h-[50px] mb-[35px]">
        {/* Titre gauche */}
        <div className="title flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/news.png" alt="news" className="mr-[12px] image-pixelated w-[28px] h-[28px]" />
          <label className="font-bold text-[var(--text-lg)] leading-[22px] text-[var(--text-100)] uppercase [text-shadow:0_1px_2px_var(--text-shadow)]">
            Derniers articles
          </label>
        </div>

        {/* Extra droite */}
        <div className="extra flex items-center gap-2 mt-3 md:mt-0 w-full md:w-auto">
          {/* Search */}
          <div className="search flex items-center w-full md:w-[255px] h-[50px] bg-[var(--shadow-200)] rounded text-[var(--text-500)] px-[10px] py-[10px] m-[2px] relative">
            <i
              className="material-icons icon grid place-items-center min-w-[30px] h-[30px] mr-2 cursor-pointer rounded text-[22px] hover:text-[var(--text-100)] hover:bg-[var(--blue-500)]"
              onClick={() => onSearch(1)}
            >
              search
            </i>
            <input
              type="text"
              placeholder="Rechercher un article"
              className="w-full h-[30px] px-[5px] bg-transparent text-[var(--text-500)] text-[var(--text-sm)] focus:outline-none"
              value={q}
              onChange={(e) => { setPage(0); setQ(e.target.value) }}
            />
          </div>

          {/* Chevrons */}
          <button
            aria-label="Précédent"
            className="m-[2px] w-[50px] h-[50px] grid place-items-center rounded font-bold text-[var(--text-lg)] bg-[var(--shadow-200)] text-[var(--text-500)] hover:bg-[var(--blue-500)] hover:text-[var(--text-100)] disabled:opacity-40"
            onClick={() => onArrows(1, 0)}
            disabled={clampedPage === 0}
          >
            <i className="material-icons">chevron_left</i>
          </button>
          <button
            aria-label="Suivant"
            className="m-[2px] w-[50px] h-[50px] grid place-items-center rounded font-bold text-[var(--text-lg)] bg-[var(--shadow-200)] text-[var(--text-500)] hover:bg-[var(--blue-500)] hover:text-[var(--text-100)] disabled:opacity-40"
            onClick={() => onArrows(1, 1)}
            disabled={clampedPage >= pageCount - 1}
          >
            <i className="material-icons">chevron_right</i>
          </button>
        </div>
      </div>

      {/* Grille de 6 cartes */}
      <AnimatePresence mode="wait">
        <motion.ul
          key={`${clampedPage}-${q}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduce ? 0.15 : 0.3 }}
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-9"
        >
          {visible.map((n, idx) => {
            const isFeatured = idx === 1
            return (
              <motion.li key={n.id} className="col" layout>
                <a href={`/news/${n.id}`} className="group block">
                  <motion.div layout className={`rounded-[4px] border overflow-hidden md:h-[280px] min-h-[35vh] md:min-h-[280px] md:max-h-[280px] transition shadow-[0_15px_15px_-15px_rgba(0,0,0,0.25)] ${isFeatured
                      ? 'bg-[#303060] border-white/5 hover:border-white/10'
                      : 'bg-[#272746] border-[#1F1F3E] hover:bg-[var(--bg-400)] hover:border-[var(--shadow-100)]'
                    }`}>
                    {/* Thumbnail */}
                    <div className="relative h-[165px] w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={n.imagem ? mediaUrl(n.imagem) : "/img/thumbnail.png"} alt="" className="w-full h-[165px] object-cover" />
                      {!isFeatured && (
                        <div className="absolute inset-0 bg-black/20" />
                      )}
                      {/* Category overlay badge — dark rounded rect */}
                      <div className="absolute left-[10px] bottom-[10px]">
                        <span className="inline-block rounded-[4px] bg-[#141433]/80 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#BEBECE]" style={{ backdropFilter: 'blur(2.5px)' }}>
                          {n.id % 3 === 0 ? 'NOUVEAUTÉ' : n.id % 3 === 1 ? 'HABBONE' : 'RARES'}
                        </span>
                      </div>
                      {/* Star badge — bottom right */}
                      <div className="absolute right-[10px] bottom-[10px]">
                        <span className={`inline-flex items-center justify-center rounded-[4px] w-[40px] h-[39px] text-lg ${isFeatured
                            ? 'bg-[#141433]/85 text-[#FFC800]'
                            : 'bg-[#141433]/80 text-[#BEBECE]'
                          }`} style={{ backdropFilter: 'blur(2.5px)' }}>
                          ★
                        </span>
                      </div>
                    </div>

                    {/* Title + description */}
                    <div className="px-4 py-3">
                      <div className="text-sm font-bold text-[#BEBECE] group-hover:text-white line-clamp-1">
                        {n.titulo || `News #${n.id}`}
                      </div>
                      {n.descricao ? (
                        <div className="mt-1 text-xs text-[#BEBECE]/60 line-clamp-2">
                          {n.descricao}
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                </a>
              </motion.li>
            )
          })}
        </motion.ul>
      </AnimatePresence>
    </section>
  )
}
